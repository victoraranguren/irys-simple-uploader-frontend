import {
  address,
  isAddress,
  lamports,
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  getSignatureFromTransaction,
  getBase58Encoder,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import bs58Module from "bs58";

const bs58 = (bs58Module as any).default || bs58Module;

/**
 * Converts private key string (Base58 or JSON Uint8Array) into raw Uint8Array bytes
 */
export function parsePrivateKeyBytes(privateKeyStr: string): Uint8Array {
  const cleanKey = privateKeyStr.trim();
  if (!cleanKey) {
    throw new Error("La clave privada está vacía.");
  }

  if (cleanKey.startsWith("[") && cleanKey.endsWith("]")) {
    try {
      const parsed = JSON.parse(cleanKey);
      if (Array.isArray(parsed)) {
        return Uint8Array.from(parsed);
      }
    } catch {
      throw new Error("Formato de array JSON inválido para la clave privada.");
    }
  }

  try {
    return bs58.decode(cleanKey);
  } catch {
    try {
      return new Uint8Array(getBase58Encoder().encode(cleanKey));
    } catch {
      throw new Error("Formato Base58 inválido para la clave privada.");
    }
  }
}

/**
 * Parses private key string and creates a Solana Kit KeyPairSigner
 */
export async function getKeyPairSignerFromStr(privateKeyStr: string) {
  const bytes = parsePrivateKeyBytes(privateKeyStr);
  if (bytes.length === 64) {
    return await createKeyPairSignerFromBytes(bytes);
  } else if (bytes.length === 32) {
    return await createKeyPairSignerFromPrivateKeyBytes(bytes);
  } else {
    throw new Error(
      `La longitud de la clave privada (${bytes.length} bytes) no es válida. Debe ser de 32 o 64 bytes.`
    );
  }
}

/**
 * Validates whether a given string is a valid Solana wallet public address using Solana Kit
 */
export function validateSolanaAddress(addr: string): boolean {
  if (!addr || typeof addr !== "string") return false;
  return isAddress(addr.trim());
}

/**
 * Gets SOL balance for a given address using Solana Kit RPC
 */
export async function getSolBalanceWithKit(
  addressStr: string,
  network: "devnet" | "mainnet"
): Promise<string> {
  if (!validateSolanaAddress(addressStr)) {
    throw new Error("Dirección pública de Solana no válida.");
  }

  const rpcUrl =
    network === "mainnet"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com";

  const rpc = createSolanaRpc(rpcUrl);
  const { value: balanceLamports } = await rpc.getBalance(address(addressStr.trim())).send();
  return (Number(balanceLamports) / 1e9).toFixed(9);
}

/**
 * Transfers SOL from user's wallet keypair to a target destination wallet using Solana Kit (@solana/kit)
 */
export async function transferSolWithKit({
  privateKey,
  destinationAddress,
  amountSol,
  network,
}: {
  privateKey: string;
  destinationAddress: string;
  amountSol: number;
  network: "devnet" | "mainnet";
}) {
  const cleanDest = destinationAddress.trim();
  if (!validateSolanaAddress(cleanDest)) {
    throw new Error(`La dirección de destino '${cleanDest}' no es una dirección válida de Solana.`);
  }

  if (isNaN(amountSol) || amountSol <= 0) {
    throw new Error("El monto a transferir debe ser un número mayor a cero.");
  }

  const signer = await getKeyPairSignerFromStr(privateKey);
  const destAddress = address(cleanDest);

  if (signer.address === destAddress) {
    throw new Error("La wallet de destino debe ser diferente a la wallet de origen.");
  }

  const rpcUrl =
    network === "mainnet"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com";

  const wsUrl =
    network === "mainnet"
      ? "wss://api.mainnet-beta.solana.com"
      : "wss://api.devnet.solana.com";

  const rpc = createSolanaRpc(rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

  // Fetch actual sender balance in lamports to validate limits & rent exemption
  const { value: senderBalanceLamports } = await rpc.getBalance(signer.address).send();
  const sendLamports = BigInt(Math.round(amountSol * 1e9));
  const estimatedFeeLamports = BigInt(5000); // 0.000005 SOL
  const rentExemptionLamports = BigInt(890880); // Rent exemption limit (~0.000891 SOL)

  if (senderBalanceLamports === BigInt(0)) {
    throw new Error(
      `La wallet de origen (${signer.address}) no tiene saldo de SOL en ${network}. Cárgale saldo en ${network} e inténtalo de nuevo.`
    );
  }

  if (sendLamports + estimatedFeeLamports > senderBalanceLamports) {
    const maxSendable = Math.max(0, Number(senderBalanceLamports - estimatedFeeLamports) / 1e9);
    throw new Error(
      `Saldo insuficiente en tu wallet de Solana (${network}). Saldo actual: ${(Number(senderBalanceLamports) / 1e9).toFixed(9)} SOL. El monto máximo que puedes transferir descontando la comisión de red (~0.000005 SOL) es ${maxSendable.toFixed(6)} SOL.`
    );
  }

  const remainingLamports = senderBalanceLamports - sendLamports - estimatedFeeLamports;
  if (remainingLamports > BigInt(0) && remainingLamports < rentExemptionLamports) {
    const maxSafe = Math.max(0, Number(senderBalanceLamports - estimatedFeeLamports - rentExemptionLamports) / 1e9);
    throw new Error(
      `Monto no permitido por las reglas de exención de renta de Solana: El saldo restante tras la transferencia (${(Number(remainingLamports) / 1e9).toFixed(6)} SOL) sería inferior al mínimo requerido (0.000891 SOL). Para no desposicionar tu wallet, transfiere como máximo ${maxSafe.toFixed(6)} SOL.`
    );
  }

  const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
    rpc,
    rpcSubscriptions,
  });

  const amountInLamports = lamports(sendLamports);

  // Get recent blockhash
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  // Build transaction using Solana Kit pipeline
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(signer.address, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) =>
      appendTransactionMessageInstruction(
        getTransferSolInstruction({
          source: signer,
          destination: destAddress,
          amount: amountInLamports,
        }),
        tx
      )
  );

  // Sign transaction
  const signedTx = await signTransactionMessageWithSigners(transactionMessage);

  // Send and confirm transaction with detailed error handling
  try {
    await (sendAndConfirmTransaction as any)(signedTx, { commitment: "confirmed" });
  } catch (err: any) {
    let detailedMsg = err?.message || "Fallo en la simulación o confirmación de la transacción.";
    if (err?.cause?.message) {
      detailedMsg = `${err.cause.message}`;
    } else if (err?.context?.__serverMessage) {
      detailedMsg = `${err.context.__serverMessage}`;
    }
    throw new Error(`Solana Kit Error: ${detailedMsg}`);
  }

  const signature = getSignatureFromTransaction(signedTx);

  // Get updated sender balance
  const { value: newBalanceLamports } = await rpc.getBalance(signer.address).send();

  return {
    success: true,
    signature,
    senderAddress: signer.address,
    destinationAddress: destAddress,
    amountTransferred: amountSol.toFixed(9),
    newSenderSolBalance: (Number(newBalanceLamports) / 1e9).toFixed(9),
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${network}`,
  };
}


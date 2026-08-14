import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";
import { Keypair, Connection, clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Parses private key string (JSON array or Base58) and returns a Solana Keypair.
 */
export function getKeypairFromStr(privateKeyStr: string): Keypair {
  const cleanKey = privateKeyStr.trim();
  if (!cleanKey) {
    throw new Error("Private key is empty");
  }

  if (cleanKey.startsWith("[") && cleanKey.endsWith("]")) {
    try {
      const parsed = JSON.parse(cleanKey);
      if (Array.isArray(parsed)) {
        return Keypair.fromSecretKey(Uint8Array.from(parsed));
      }
    } catch (e) {
      throw new Error("Invalid JSON array format for private key");
    }
  }

  try {
    return Keypair.fromSecretKey(bs58.decode(cleanKey));
  } catch (e) {
    throw new Error("Invalid Base58 private key format");
  }
}

/**
 * Establishes Connection and gets Uploader for Irys
 */
export async function getIrysConnection(keypair: Keypair, network: "devnet" | "mainnet") {
  const isMainnet = network === "mainnet";
  const rpcUrl = isMainnet
    ? "https://api.mainnet-beta.solana.com"
    : clusterApiUrl("devnet");

  const connection = new Connection(rpcUrl, "confirmed");

  let uploader;
  if (isMainnet) {
    uploader = await Uploader(Solana)
      .withWallet(keypair.secretKey)
      .withRpc(rpcUrl);
  } else {
    uploader = await Uploader(Solana)
      .devnet()
      .withWallet(keypair.secretKey)
      .withRpc(rpcUrl);
  }

  return { uploader, connection, rpcUrl };
}

import { NextResponse } from "next/server";
import { getKeypairFromStr, getIrysConnection } from "../../utils/irys";
import { transferSolWithKit, validateSolanaAddress } from "../../utils/solanaKit";

export async function POST(req: Request) {
  try {
    const { privateKey, network, amount, destinationAddress } = await req.json();

    if (!privateKey) {
      return NextResponse.json({ error: "Private key is required" }, { status: 400 });
    }

    if (network !== "devnet" && network !== "mainnet") {
      return NextResponse.json({ error: "Invalid network selection" }, { status: 400 });
    }

    if (!amount) {
      return NextResponse.json({ error: "Withdrawal amount is required" }, { status: 400 });
    }

    if (destinationAddress && !validateSolanaAddress(destinationAddress)) {
      return NextResponse.json(
        { error: `La dirección de destino '${destinationAddress}' no es una wallet de Solana válida.` },
        { status: 400 }
      );
    }

    const keypair = getKeypairFromStr(privateKey);
    const address = keypair.publicKey.toBase58();

    const { uploader } = await getIrysConnection(keypair, network);

    // Fetch current balance
    const irysBalance = await uploader.getBalance(address);

    if (irysBalance.isZero()) {
      return NextResponse.json({ error: "No funds available to withdraw on Irys." }, { status: 400 });
    }

    let withdrawAmountAtomic;

    if (amount === "all") {
      const SOLANA_FEE_ATOMIC = 5000; // Small buffer for transaction fee on Solana
      if (irysBalance.lte(SOLANA_FEE_ATOMIC)) {
        return NextResponse.json({
          error: `Available balance (${uploader.utils.fromAtomic(irysBalance).toFixed(9)} SOL) is too small to cover the withdrawal fee (0.000005 SOL).`
        }, { status: 400 });
      }
      withdrawAmountAtomic = irysBalance.minus(SOLANA_FEE_ATOMIC);
    } else {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: "Invalid withdraw amount. Must be a positive number or 'all'." }, { status: 400 });
      }
      withdrawAmountAtomic = uploader.utils.toAtomic(parsedAmount);

      if (withdrawAmountAtomic.gt(irysBalance)) {
        return NextResponse.json({
          error: `Requested amount (${parsedAmount.toFixed(9)} SOL) exceeds the available balance in Irys (${uploader.utils.fromAtomic(irysBalance).toFixed(9)} SOL).`
        }, { status: 400 });
      }
    }

    // Perform Irys node withdrawal
    let response;
    const uploaderAny = uploader as any;
    if (typeof uploaderAny.withdrawBalance === "function") {
      response = await uploaderAny.withdrawBalance(withdrawAmountAtomic);
    } else if (typeof uploaderAny.withdraw === "function") {
      response = await uploaderAny.withdraw(withdrawAmountAtomic);
    } else {
      throw new Error("Withdrawal method not found in this version of the Irys SDK.");
    }

    const amountWithdrawnNum = Number(uploader.utils.fromAtomic(withdrawAmountAtomic));
    const newBalance = await uploader.getBalance(address);

    let forwardedTransferResult = null;

    // If a target destination wallet is specified and is different from current wallet, send SOL via Solana Kit
    if (destinationAddress && destinationAddress.trim() !== address) {
      try {
        // Leave a tiny fee cushion for Solana tx fee
        const forwardAmount = Math.max(0, amountWithdrawnNum - 0.000005);
        if (forwardAmount > 0) {
          forwardedTransferResult = await transferSolWithKit({
            privateKey,
            destinationAddress: destinationAddress.trim(),
            amountSol: forwardAmount,
            network,
          });
        }
      } catch (fwdErr: any) {
        console.error("Forwarding withdrawn SOL to target wallet failed:", fwdErr);
      }
    }

    return NextResponse.json({
      success: true,
      amountWithdrawn: uploader.utils.fromAtomic(withdrawAmountAtomic).toFixed(9),
      newBalance: uploader.utils.fromAtomic(newBalance).toFixed(9),
      txDetails: response,
      forwardedTransfer: forwardedTransferResult,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Withdrawal failed" }, { status: 500 });
  }
}

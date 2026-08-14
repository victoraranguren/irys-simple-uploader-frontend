import { NextResponse } from "next/server";
import { getKeypairFromStr, getIrysConnection } from "../../utils/irys";

export async function POST(req: Request) {
  try {
    const { privateKey, network } = await req.json();

    if (!privateKey) {
      return NextResponse.json({ error: "Private key is required" }, { status: 400 });
    }

    if (network !== "devnet" && network !== "mainnet") {
      return NextResponse.json({ error: "Invalid network selection" }, { status: 400 });
    }

    const keypair = getKeypairFromStr(privateKey);
    const address = keypair.publicKey.toBase58();

    const { uploader, connection } = await getIrysConnection(keypair, network);

    // Fetch Solana Balance
    let solanaBalance = 0;
    try {
      solanaBalance = await connection.getBalance(keypair.publicKey);
    } catch (e: any) {
      console.error("Solana balance error:", e);
    }

    // Fetch Irys Balance
    let irysBalance = "0";
    try {
      const balanceAtomic = await uploader.getBalance(address);
      irysBalance = uploader.utils.fromAtomic(balanceAtomic).toFixed(9);
    } catch (e: any) {
      console.error("Irys balance error:", e);
    }

    return NextResponse.json({
      success: true,
      address,
      solanaBalance: (solanaBalance / 1e9).toFixed(9),
      irysBalance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to retrieve balances" }, { status: 500 });
  }
}

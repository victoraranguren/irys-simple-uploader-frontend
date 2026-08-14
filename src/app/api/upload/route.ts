import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getKeypairFromStr, getIrysConnection } from "../../utils/irys";

export async function POST(req: Request) {
  let tempFilePath: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    const privateKey = formData.get("privateKey") as string | null;
    const network = formData.get("network") as "devnet" | "mainnet" | null;
    const autoFund = formData.get("autoFund") === "true";
    const fundAmountStr = formData.get("fundAmount") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!privateKey) {
      return NextResponse.json({ error: "Private key is required" }, { status: 400 });
    }
    if (network !== "devnet" && network !== "mainnet") {
      return NextResponse.json({ error: "Invalid network selection" }, { status: 400 });
    }

    const keypair = getKeypairFromStr(privateKey);
    const address = keypair.publicKey.toBase58();

    const { uploader } = await getIrysConnection(keypair, network);

    // 1. Auto-funding if requested
    let fundingTxId: string | null = null;
    let fundingAmountSol: number | null = null;
    
    if (autoFund && fundAmountStr) {
      const fundSol = parseFloat(fundAmountStr);
      if (!isNaN(fundSol) && fundSol > 0) {
        try {
          const fundAmountAtomic = uploader.utils.toAtomic(fundSol);
          const fundTx = await uploader.fund(fundAmountAtomic);
          fundingTxId = fundTx.id;
          fundingAmountSol = fundSol;
        } catch (fundErr: any) {
          return NextResponse.json({ 
            error: `Auto-funding failed: ${fundErr.message || fundErr}. Make sure your Solana wallet has sufficient SOL.` 
          }, { status: 400 });
        }
      }
    }

    // 2. Write file to a temporary directory
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = (file as any).name || "upload";
    tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${fileName}`);
    
    await fs.writeFile(tempFilePath, buffer);

    // 3. Upload file to Irys
    const fileType = file.type || "application/octet-stream";
    const tags = [{ name: "Content-Type", value: fileType }];
    
    const uploadReceipt = await uploader.uploadFile(tempFilePath, { tags });
    
    // Clean up temporary file immediately
    await fs.unlink(tempFilePath);
    tempFilePath = null;

    // 4. Retrieve final balances
    let finalIrysBalance = "0";
    try {
      const balanceAtomic = await uploader.getBalance(address);
      finalIrysBalance = uploader.utils.fromAtomic(balanceAtomic).toFixed(9);
    } catch (balErr) {}

    return NextResponse.json({
      success: true,
      url: `https://gateway.irys.xyz/${uploadReceipt.id}`,
      id: uploadReceipt.id,
      size: file.size,
      fundingTxId,
      fundingAmountSol,
      finalIrysBalance,
    });
  } catch (err: any) {
    // If temp file was created but not deleted, clean it up
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {}
    }
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

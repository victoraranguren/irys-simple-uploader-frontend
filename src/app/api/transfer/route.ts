import { NextResponse } from "next/server";
import { transferSolWithKit, validateSolanaAddress } from "../../utils/solanaKit";

export async function POST(req: Request) {
  try {
    const { privateKey, network, destinationAddress, amount } = await req.json();

    if (!privateKey) {
      return NextResponse.json({ error: "Se requiere la clave privada." }, { status: 400 });
    }

    if (network !== "devnet" && network !== "mainnet") {
      return NextResponse.json({ error: "Selección de red inválida." }, { status: 400 });
    }

    if (!destinationAddress) {
      return NextResponse.json(
        { error: "Se requiere la dirección de la wallet de destino." },
        { status: 400 }
      );
    }

    if (!validateSolanaAddress(destinationAddress)) {
      return NextResponse.json(
        { error: `La dirección de destino '${destinationAddress}' no es una wallet de Solana válida.` },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "El monto a retirar/transferir debe ser un número positivo." },
        { status: 400 }
      );
    }

    const result = await transferSolWithKit({
      privateKey,
      destinationAddress,
      amountSol: parsedAmount,
      network,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Solana Kit transfer error:", err);
    return NextResponse.json(
      { error: err.message || "Error al procesar la transferencia con Solana Kit" },
      { status: 500 }
    );
  }
}

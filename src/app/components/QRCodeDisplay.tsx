"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  text: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({
  text,
  size = 250,
  className = "w-52 h-52 md:w-56 md:h-56 object-contain rounded-lg",
}: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!text) {
      setDataUrl(null);
      return;
    }

    let isMounted = true;

    QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(false);
        }
      })
      .catch((err) => {
        console.error("Error generating local QR code:", err);
        if (isMounted) {
          setError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [text, size]);

  if (error) {
    return (
      <div className="w-52 h-52 flex items-center justify-center text-xs text-red-400 bg-red-950/20 rounded-lg p-2 text-center">
        Error al generar código QR localmente.
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="w-52 h-52 flex items-center justify-center text-xs text-zinc-400 animate-pulse bg-zinc-100 rounded-lg">
        Generando QR local...
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={dataUrl}
      alt="Wallet QR Code"
      width={size}
      height={size}
      className={className}
    />
  );
}

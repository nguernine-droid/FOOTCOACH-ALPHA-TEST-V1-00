"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/** QR code rendu sur canvas, sans aucun appel réseau (génération locale). */
export function QrCodeCanvas({ value, size = 240, label }: { value: string; size?: number; label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      color: { dark: "#071B3F", light: "#FFFFFF" },
    }).catch(() => undefined);
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-line bg-white"
      role="img"
      aria-label={label ?? "QR code"}
    />
  );
}

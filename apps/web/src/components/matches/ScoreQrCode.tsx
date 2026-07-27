"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/** QR code du jeton de validation, rendu sur canvas (aucun appel réseau). */
export function ScoreQrCode({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, token, {
      width: 240,
      margin: 1,
      color: { dark: "#071B3F", light: "#FFFFFF" },
    }).catch(() => undefined);
  }, [token]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-line bg-white"
      role="img"
      aria-label="QR code de validation du score"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/** QR code rendu sur canvas, sans aucun appel réseau (génération locale). */
export function QrCodeCanvas({ value, size = 240, label }: { value: string; size?: number; label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Un QR code est lu par un appareil photo, pas par un œil : il lui faut le
    // contraste maximal, quel que soit le thème. D'où deux jetons volontairement
    // identiques dans le clair et le sombre — l'inverser en thème sombre le
    // rendrait illisible pour une bonne partie des scanners.
    const styles = getComputedStyle(document.documentElement);
    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      color: {
        dark: styles.getPropertyValue("--qr-dark").trim(),
        light: styles.getPropertyValue("--qr-light").trim(),
      },
    }).catch(() => undefined);
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-line"
      style={{ backgroundColor: "var(--qr-light)" }}
      role="img"
      aria-label={label ?? "QR code"}
    />
  );
}

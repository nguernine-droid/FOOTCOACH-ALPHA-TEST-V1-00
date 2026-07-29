"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Scanner de QR code : ouvre la caméra arrière dans la page et décode en continu
 * jusqu'à trouver un code. `onResult` reçoit le texte décodé.
 *
 * La caméra n'est accessible qu'en contexte sécurisé (HTTPS, ou localhost en dev) :
 * hors de ce cas, le navigateur refuse et on affiche l'erreur telle quelle.
 */
export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Ce navigateur ne donne pas accès à la caméra.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        frameRef.current = requestAnimationFrame(tick);
      } catch (err) {
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorisez-la dans votre navigateur, puis réessayez."
            : "Impossible d'ouvrir la caméra sur cet appareil.",
        );
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || doneRef.current) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
          if (code?.data) {
            doneRef.current = true;
            stop();
            onResult(code.data);
            return;
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [onResult, stop]);

  // Viseur plein écran, mais l'unique commande — annuler — est en bas :
  // une croix en haut à droite est intenable quand on tient le téléphone
  // d'une main et le QR code de l'autre.
  return (
    <div
      className="fixed inset-0 z-50 bg-navy-900/95 flex flex-col p-4 pt-[max(1rem,env(safe-area-inset-top))]"
      role="dialog"
      aria-modal
      aria-label="Scanner le QR code"
    >
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3">
        <div className="w-full max-w-sm space-y-3">
          <p className="display text-lg text-white text-center">Scanner le QR code</p>

          {error ? (
            <div className="card p-6 text-center space-y-3">
              <span className="w-12 h-12 rounded-lg bg-coral-soft text-coral flex items-center justify-center mx-auto">
                <CameraOff size={22} />
              </span>
              <p className="text-sm font-bold">Caméra indisponible</p>
              <p className="text-xs text-ink-soft">{error}</p>
            </div>
          ) : (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-8 border-2 border-accent-solid rounded-lg pointer-events-none" aria-hidden />
              </div>
              <p className="text-xs text-white/80 text-center">
                Visez le QR code affiché sur l&apos;écran du coach adverse.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 w-full max-w-sm mx-auto pb-[env(safe-area-inset-bottom)]">
        <Button variant="ghost" size="lg" onClick={onClose} className="w-full !text-white !border-white/25 hover:!bg-white/10">
          <X size={16} /> {error ? "Fermer" : "Annuler le scan"}
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Feuille ancrée au bord bas de l'écran — le format de dialogue du mobile :
 * elle apparaît dans la zone du pouce, se referme d'un glissé vers le bas, et
 * son bouton de fermeture reste en bas plutôt qu'en haut à droite.
 *
 * Au-delà de 960 px, où l'on vise à la souris, elle redevient une boîte
 * centrée classique (le glissé et la poignée disparaissent).
 *
 * `footer` est collé sous la zone défilante : le CTA reste visible même
 * clavier ouvert, et au-dessus de la barre d'accueil iOS.
 *
 * Rendue dans `document.body` par un portail, et non là où elle est appelée :
 * un `position: fixed` se cale sur le premier ancêtre transformé, filtré ou
 * animé, et non sur la fenêtre. Or les cartes de l'app entrent en scène par
 * une translation — une feuille ouverte depuis l'une d'elles se serait ancrée
 * à la carte. Le portail la sort de cette zone d'influence une bonne fois.
 */
export function BottomSheet({
  onClose,
  label,
  children,
  footer,
  className,
}: {
  onClose: () => void;
  /** Nom de la feuille pour les lecteurs d'écran */
  label: string;
  children: React.ReactNode;
  /** Zone d'actions collée en bas (CTA, fermeture) */
  footer?: React.ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<number | null>(null);
  // `document.body` n'existe pas au rendu serveur : le portail n'est posé
  // qu'une fois le composant monté côté client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Fermeture différée : la feuille redescend avant d'être démontée
  const close = useCallback(() => setClosing(true), []);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onClose, 180);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  // Échap ferme, et le fond ne défile plus derrière la feuille
  useEffect(() => {
    if (!mounted) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [close, mounted]);

  // Glissé vers le bas depuis la poignée / l'en-tête : au-delà de 96 px, on ferme
  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      startRef.current = e.clientY;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (startRef.current == null) return;
      setDragY(Math.max(0, e.clientY - startRef.current));
    },
    onPointerUp: () => {
      if (startRef.current == null) return;
      startRef.current = null;
      setDragging(false);
      if (dragY > 96) close();
      else setDragY(0);
    },
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "sheet-scrim fixed inset-0 z-50 flex items-end min-[960px]:items-center justify-center bg-navy-900/50 min-[960px]:p-6",
        closing ? "opacity-0 transition-opacity duration-150" : "animate-fade-in",
      )}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{
          transform: closing ? "translateY(100%)" : `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 180ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        className={cn(
          "w-full min-[960px]:max-w-lg surface rounded-t-2xl min-[960px]:rounded-2xl shadow-pop outline-none",
          "flex flex-col max-h-[88dvh]",
          !closing && "animate-sheet-in",
          className,
        )}
      >
        {/* Poignée : cible de glissé, et signal visuel qu'on peut refermer d'un geste */}
        <div
          {...dragHandlers}
          className="min-[960px]:hidden shrink-0 pt-2.5 pb-1.5 flex justify-center cursor-grab touch-none"
          aria-hidden
        >
          <span className="w-10 h-1 rounded-full bg-line" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-line surface rounded-b-2xl px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-[960px]:pb-3">
            {footer}
          </div>
        )}

        {/* Sans footer, la feuille garde quand même sa marge de sécurité basse */}
        {!footer && <div className="shrink-0 h-[env(safe-area-inset-bottom)]" aria-hidden />}
      </div>
    </div>,
    document.body,
  );
}

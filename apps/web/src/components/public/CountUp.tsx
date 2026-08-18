"use client";

import { useEffect, useRef, useState } from "react";

/** Décélération franche : le compteur part vite et se pose, il ne freine pas. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Un chiffre qui monte quand on arrive dessus.
 *
 * Le rendu SERVEUR porte la valeur finale : c'est elle qui part dans le HTML,
 * donc dans l'index des moteurs et dans la lecture d'un lecteur d'écran. Le
 * décompte n'est qu'un habillage ajouté par le navigateur — il ne peut pas
 * emporter l'information avec lui.
 *
 * L'élément animé est masqué aux technologies d'assistance : sans cela, une
 * synthèse vocale annoncerait les trente valeurs intermédiaires. Le nombre
 * lisible est fourni à côté, une fois, par l'appelant.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Remis à zéro dès le montage : si le chiffre est sous la ligne de
    // flottaison, personne ne voit la bascule ; s'il est déjà à l'écran,
    // l'observateur déclenche dans la foulée et la reprise passe pour le
    // début du décompte.
    setShown(0);

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const started = performance.now();
        const duration = 900;
        const step = (now: number) => {
          const progress = Math.min(1, (now - started) / duration);
          setShown(Math.round(easeOut(progress) * value));
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} aria-hidden className={className}>
      {shown.toLocaleString("fr-FR")}
    </span>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Une entrée au défilement, jouée UNE fois.
 *
 * ── Pourquoi pas Framer Motion ──────────────────────────────────────────
 * La bibliothèque pèse une cinquantaine de kilo-octets compressés pour ce que
 * `IntersectionObserver` et deux propriétés CSS font en une poignée de lignes.
 * Sur une page de présentation ouverte en 4G au bord d'un terrain, c'est le
 * genre d'arbitrage qui se voit au premier affichage.
 *
 * ── Le risque à ne pas prendre ──────────────────────────────────────────
 * L'état de départ est invisible. Si le script ne s'exécute jamais, la page
 * entière reste blanche — la pire panne possible ici. Deux garde-fous : une
 * feuille `<noscript>` posée par `VitrineShell` qui remet tout à sa place, et
 * la révélation immédiate ci-dessous dès que l'observateur manque à l'appel.
 */
export function Reveal({
  children,
  className,
  /** Décalage en cascade entre voisins — 80 ms suffisent à lire l'ordre */
  delay = 0,
  /**
   * L'élément rendu. `li` existe parce qu'une entrée animée à l'intérieur
   * d'une liste ordonnée doit RESTER un élément de liste : glisser un `div`
   * entre le `<ol>` et ses items casse la sémantique de la liste, et un
   * lecteur d'écran cesse d'annoncer « 1 sur 3 ».
   */
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reveal = () => {
      node.dataset.reveal = "in";
    };

    // Pas d'observateur, ou un visiteur qui a demandé moins de mouvement :
    // le contenu est déjà à sa place, on ne fait que le rendre visible.
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal();
          // Une seule fois : rejouer l'entrée à chaque passage transformerait
          // un défilement de relecture en diaporama.
          observer.disconnect();
        }
      },
      // La marge négative retarde le déclenchement jusqu'à ce que l'élément
      // soit franchement entré, plutôt qu'au premier pixel visible.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // Rappel de rattachement plutôt qu'objet direct : le même composant rend
      // deux balises différentes, et une `RefObject` typée pour l'une ne
      // convient pas à l'autre.
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      data-reveal="pending"
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}

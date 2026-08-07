"use client";

import { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIsCompact } from "@/lib/useIsCompact";

/** Course horizontale minimale, en px, pour qu'un glissé compte comme un changement d'onglet */
const MIN_DISTANCE = 64;
/** Le geste doit être franchement horizontal : sinon c'est un défilement vertical */
const HORIZONTAL_RATIO = 1.6;
/** Au-delà, ce n'est plus un geste mais une hésitation : on laisse tomber */
const MAX_DURATION_MS = 800;

/**
 * Vrai si le glissé a commencé dans quelque chose qui défile déjà
 * horizontalement — la rangée des catégories du radar, une grille de mois.
 *
 * Sans cette garde, faire défiler dix-huit pastilles de catégorie changeait
 * d'onglet au passage : deux gestes identiques pour deux intentions opposées.
 */
function insideHorizontalScroller(start: EventTarget | null): boolean {
  let node = start instanceof Element ? start : null;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 2) {
      const overflow = getComputedStyle(node).overflowX;
      if (overflow === "auto" || overflow === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * Glissé horizontal pour passer d'un onglet à l'autre, au téléphone seulement.
 *
 * Les trois onglets du bas sont voisins dans la tête du coach : le pouce va
 * naturellement les balayer. Au-delà de 960 px on vise à la souris, où le
 * geste n'existe pas — le composant ne s'y arme pas.
 *
 * Le glissé n'agit que depuis la RACINE d'un onglet : sur une sous-page
 * (une feuille de match, un formulaire), il ne se passe rien. Sans quoi un
 * geste anodin ferait perdre une saisie en cours.
 */
export function SwipeTabs({ hrefs, children }: { hrefs: string[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const compact = useIsCompact();
  const start = useRef<{ x: number; y: number; at: number } | null>(null);

  const index = hrefs.indexOf(pathname);
  const armed = compact && index !== -1;

  if (!armed) return <>{children}</>;

  return (
    <div
      onTouchStart={(e) => {
        // Deux doigts : c'est un zoom, pas une navigation.
        if (e.touches.length !== 1 || insideHorizontalScroller(e.target)) {
          start.current = null;
          return;
        }
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY, at: Date.now() };
      }}
      onTouchEnd={(e) => {
        const from = start.current;
        start.current = null;
        if (!from || e.changedTouches.length !== 1) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - from.x;
        const dy = t.clientY - from.y;
        if (Date.now() - from.at > MAX_DURATION_MS) return;
        if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;
        // Vers la gauche = onglet suivant, comme les pages d'un carnet. Aux
        // extrémités, rien : pas de bouclage — on ne saute pas des Matchs au
        // Tableau de bord sans savoir qu'on a fait le tour.
        const next = dx < 0 ? index + 1 : index - 1;
        if (next < 0 || next >= hrefs.length) return;
        router.push(hrefs[next]);
      }}
    >
      {children}
    </div>
  );
}

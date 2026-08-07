"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { skipNextPageTransition } from "@/components/PageTransition";
import { useIsCompact } from "@/lib/useIsCompact";

/** Part de la largeur à franchir pour que l'écran bascule */
const SNAP_RATIO = 0.28;
/** px/ms : un geste vif emporte la décision sans aller jusqu'au quart */
const FLICK_VELOCITY = 0.45;
/** Aux extrémités, l'écran résiste au lieu de suivre — on sent qu'il n'y a rien après */
const EDGE_RESISTANCE = 0.28;
/** En deçà, on ne sait pas encore si le geste est horizontal ou vertical */
const AXIS_THRESHOLD = 8;

export type Pane = { href: string; node: React.ReactNode };

/**
 * Vrai si le geste part de quelque chose qui défile déjà horizontalement — la
 * rangée des catégories du radar, une grille de mois. Sans cette garde, faire
 * défiler dix-huit pastilles emmenait l'écran entier avec elles.
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
 * Les onglets du bas montés côte à côte, et le doigt qui les fait défiler.
 *
 * Ce n'est pas un geste qui navigue : les trois écrans existent en même temps,
 * rangés sur une bande horizontale. Pendant le glissé on voit donc les deux à
 * la fois, l'un qui sort et l'autre qui entre, et un geste relâché à mi-chemin
 * ramène celui d'où l'on vient.
 *
 * Ce que ça coûte, et qui est assumé : les trois pages sont montées ensemble,
 * donc leurs requêtes partent ensemble au premier affichage. C'est le prix de
 * l'écran voisin déjà dessiné — un écran monté au moment du geste arriverait
 * vide, et le carrousel n'aurait plus d'intérêt.
 *
 * Hors téléphone (≥ 960 px), rien de tout cela : `fallback` est rendu tel quel,
 * c'est-à-dire la page de la route courante, comme partout ailleurs.
 */
export function TabPager({ panes, fallback }: { panes: Pane[]; fallback: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const compact = useIsCompact();

  const viewportRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  /**
   * L'écran visé, tant que l'URL n'a pas suivi. `router.push` ne se répercute
   * qu'au rendu suivant : sans cet index optimiste, la bande reviendrait une
   * image en arrière avant de sauter sur la bonne — un rebond bien visible.
   */
  const [target, setTarget] = useState<number | null>(null);
  const gesture = useRef<{ x: number; y: number; at: number; axis: "x" | "y" | null } | null>(null);

  const routeIndex = panes.findIndex((p) => p.href === pathname);
  const index = target ?? routeIndex;
  const armed = compact && routeIndex !== -1;

  // L'URL a rattrapé le geste : l'index optimiste n'a plus lieu d'être.
  useEffect(() => {
    if (target !== null && routeIndex === target) setTarget(null);
  }, [routeIndex, target]);

  if (!armed) return <>{fallback}</>;

  const last = panes.length - 1;
  const neighbour = drag < 0 ? index + 1 : index - 1;

  return (
    <div
      ref={viewportRef}
      className="overflow-hidden"
      // `pan-y` dit au navigateur : le vertical est à toi, l'horizontal est à
      // moi. C'est ce qui évite d'avoir à annuler l'événement — React pose des
      // écouteurs passifs, où `preventDefault` ne ferait rien.
      style={{ touchAction: "pan-y" }}
      onTouchStart={(e) => {
        if (e.touches.length !== 1 || insideHorizontalScroller(e.target)) {
          gesture.current = null;
          return;
        }
        const t = e.touches[0];
        gesture.current = { x: t.clientX, y: t.clientY, at: Date.now(), axis: null };
      }}
      onTouchMove={(e) => {
        const g = gesture.current;
        if (!g || e.touches.length !== 1) return;
        const t = e.touches[0];
        let dx = t.clientX - g.x;
        const dy = t.clientY - g.y;

        if (g.axis === null) {
          if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
          g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          // Geste vertical : c'est un défilement, on ne s'en mêle plus.
          if (g.axis === "y") {
            gesture.current = null;
            return;
          }
          setDragging(true);
        }

        if ((index === 0 && dx > 0) || (index === last && dx < 0)) dx *= EDGE_RESISTANCE;
        setDrag(dx);
      }}
      onTouchEnd={() => {
        const g = gesture.current;
        gesture.current = null;
        setDragging(false);
        if (!g || g.axis !== "x") return;

        const width = viewportRef.current?.clientWidth ?? 1;
        const elapsed = Math.max(1, Date.now() - g.at);
        const decisive = Math.abs(drag) > width * SNAP_RATIO || Math.abs(drag) / elapsed > FLICK_VELOCITY;
        const next = drag < 0 ? index + 1 : index - 1;
        setDrag(0);
        if (!decisive || next < 0 || next > last) return;

        // L'écran est déjà à sa place, la bande finit sa course toute seule :
        // l'animation d'entrée de page n'a rien à jouer par-dessus.
        skipNextPageTransition();
        setTarget(next);
        router.push(panes[next].href);
      }}
    >
      <div
        className="flex items-start"
        style={{
          transform: `translate3d(calc(${-index * 100}% + ${drag}px), 0, 0)`,
          transition: dragging ? "none" : "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)",
          willChange: "transform",
        }}
      >
        {panes.map((pane, i) => {
          // Les écrans qu'on ne voit pas sont repliés à zéro : la fenêtre prend
          // ainsi d'elle-même la hauteur de l'écran courant — et celle du plus
          // grand des deux pendant un glissé, puisque le voisin se déplie.
          //
          // Réglé en CSS, et non en mesurant les hauteurs au JavaScript : une
          // mesure dépend d'un ResizeObserver, donc d'une boucle de rendu qui
          // tourne. Ici la page ne peut pas se retrouver haute de trois écrans
          // parce qu'un observateur a manqué son tour.
          const visible = i === index || (dragging && i === neighbour);
          return (
            <div
              key={pane.href}
              className={visible ? "w-full shrink-0" : "w-full shrink-0 h-0 overflow-hidden"}
              // Seul l'écran courant est dans l'ordre de lecture : un lecteur
              // d'écran ne doit pas parcourir trois onglets à la suite.
              aria-hidden={i !== index || undefined}
            >
              {pane.node}
            </div>
          );
        })}
      </div>
    </div>
  );
}

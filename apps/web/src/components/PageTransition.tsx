"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Transition d'écran à écran.
 *
 * Trois choix expliqués, parce qu'ils ne sont pas évidents :
 *
 * 1. Pas d'API View Transitions. La version intégrée à React n'existe que sur
 *    les canaux expérimentaux ; l'API native brute, elle, fige une capture de
 *    la page jusqu'à ce que le DOM soit à jour — or l'App Router attend un
 *    aller-retour réseau. Sur une connexion lente, l'écran resterait gelé.
 *
 * 2. Pas de `key={pathname}` sur les enfants. Cela remonterait tout l'arbre à
 *    chaque changement de paramètre d'URL, y compris `?nouveau=1` : l'état des
 *    pages serait perdu et les requêtes relancées.
 *
 * 3. Mouvement vertical seulement. Un glissé horizontal est plus conventionnel
 *    pour une navigation en profondeur, mais il déborde du cadre pendant
 *    l'animation : soit une barre de défilement apparaît, soit il faut rogner
 *    l'axe X — ce qui couperait les popovers de date sur desktop.
 *
 * L'animation ne porte que sur `opacity` et `transform` : tout reste sur le
 * compositeur.
 */

/** Segments d'un chemin, sans les vides */
function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/**
 * Sens de la navigation : +1 on entre dans un détail, -1 on en ressort,
 * 0 on change simplement d'onglet.
 *
 * Une descente exige que l'ancien chemin soit un préfixe du nouveau ET qu'il
 * compte au moins deux segments : sans cette seconde condition, la racine de
 * l'espace (`/coach`) serait préfixe de tout et chaque onglet passerait pour
 * une descente.
 */
export function navigationDirection(from: string, to: string): -1 | 0 | 1 {
  const a = segments(from);
  const b = segments(to);
  const isPrefix = (short: string[], long: string[]) =>
    short.length < long.length && short.every((segment, i) => segment === long[i]);

  if (a.length >= 2 && isPrefix(a, b)) return 1;
  if (b.length >= 2 && isPrefix(b, a)) return -1;
  return 0;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Le carrousel des onglets change l'URL alors que l'écran est DÉJÀ arrivé à sa
 * place : il a suivi le doigt. Rejouer l'entrée par-dessus le ferait clignoter.
 * Le drapeau est consommé par la première transition qui suit, et une seule.
 */
let skipOnce = false;
export function skipNextPageTransition() {
  skipOnce = true;
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<string | null>(null);

  // Effet de mise en page : l'animation est posée avant que le navigateur ne
  // peigne, sinon le nouvel écran apparaîtrait une image à sa position finale
  // avant de sauter au début de l'animation.
  useIsomorphicLayoutEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    // Premier rendu : l'entrée est déjà assurée par la silhouette du shell
    if (from === null || from === pathname) return;
    if (skipOnce) {
      skipOnce = false;
      return;
    }

    const node = ref.current;
    if (!node?.animate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const direction = navigationDirection(from, pathname);
    // On entre : le contenu monte. On revient : il redescend. Sinon, à peine.
    const offset = direction === 1 ? 14 : direction === -1 ? -14 : 6;

    node.animate(
      [
        { opacity: 0, transform: `translateY(${offset}px)` },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: direction === 0 ? 200 : 260,
        easing: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    );
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}

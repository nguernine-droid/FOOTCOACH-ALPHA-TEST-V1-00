"use client";

import { useEffect, useState } from "react";

/** Point de bascule unique de l'app : sous 960 px, on vise au pouce. */
export const COMPACT_QUERY = "(max-width: 959.98px)";

/**
 * Vrai sur les écrans étroits. Part de `false` au premier rendu pour rester
 * identique au HTML du serveur ; la valeur réelle arrive dès l'effet, donc
 * bien avant qu'un panneau ne soit ouvert par l'utilisateur.
 */
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return compact;
}

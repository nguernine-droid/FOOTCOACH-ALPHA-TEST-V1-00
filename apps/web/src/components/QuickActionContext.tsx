"use client";

import { createContext, useContext, useEffect } from "react";

/**
 * Une des créations proposées quand le « + » en offre plusieurs.
 *
 * `icon` est une clé et non un composant : l'action transite par un
 * `JSON.stringify` (voir plus bas), qui réduirait une fonction à `undefined`.
 */
export type QuickChoice = {
  href: string;
  label: string;
  /** Ce que ça fait, en une ligne : deux créations voisines se confondent vite */
  description: string;
  icon: "announcement" | "tournament" | "publication" | "feedback";
};

/**
 * Action du bouton central de la barre d'onglets.
 * - `link` : le bouton « + » ouvre directement un écran de création ;
 * - `choice` : il ouvre une feuille et laisse choisir entre plusieurs ;
 * - `submit` : sur un formulaire de création, il devient un « ✓ » qui valide.
 *   L'association se fait par l'attribut HTML `form`, si bien que le bouton
 *   soumet le formulaire tout en vivant ailleurs dans l'arbre.
 */
export type QuickAction =
  | { kind: "link"; href: string; label: string }
  | { kind: "choice"; label: string; options: QuickChoice[] }
  | { kind: "submit"; formId: string; label: string; disabled?: boolean };

const QuickActionSetter = createContext<((action: QuickAction | null) => void) | null>(null);

export const QuickActionProvider = QuickActionSetter.Provider;

/**
 * Remplace l'action du bouton central tant que la page est affichée, et la
 * rend à la barre d'onglets au démontage.
 */
export function useQuickActionOverride(action: QuickAction | null) {
  const setAction = useContext(QuickActionSetter);
  // La sérialisation sert de dépendance : l'action est un objet recréé à chaque rendu
  const key = action ? JSON.stringify(action) : null;

  useEffect(() => {
    if (!setAction) return;
    setAction(key ? (JSON.parse(key) as QuickAction) : null);
    return () => setAction(null);
  }, [setAction, key]);
}

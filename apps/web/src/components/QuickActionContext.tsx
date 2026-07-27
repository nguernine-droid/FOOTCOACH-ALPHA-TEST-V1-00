"use client";

import { createContext, useContext, useEffect } from "react";

/**
 * Action du bouton central de la barre d'onglets.
 * - `link` : le cas courant, le bouton « + » ouvre un écran de création ;
 * - `submit` : sur un formulaire de création, il devient un « ✓ » qui valide.
 *   L'association se fait par l'attribut HTML `form`, si bien que le bouton
 *   soumet le formulaire tout en vivant ailleurs dans l'arbre.
 */
export type QuickAction =
  | { kind: "link"; href: string; label: string }
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

"use client";

import { createContext, useContext } from "react";

/**
 * Ce qui allume une pastille sur un onglet, fourni par RoleGuard à la barre de
 * navigation. Passe par un contexte parce que la barre est fournie en `nav` par
 * le layout du rôle : elle est rendue par RoleGuard sans en être enfant dans le
 * code.
 */
export type TabBadges = {
  /** Il reste des activités non lues — l'onglet du tableau de bord les affiche */
  activity: boolean;
  /** Messages reçus et non lus, tous fils confondus */
  messages: number;
  /**
   * Relit le compteur de messages. À appeler après avoir marqué un fil comme
   * lu : sans cela la pastille resterait allumée pendant qu'on lit la
   * conversation qui l'avait allumée, ce qui donne le sentiment de ne jamais
   * en venir à bout.
   */
  refreshMessages: () => void;
};

export const TabBadgesContext = createContext<TabBadges | null>(null);

export function useTabBadges(): TabBadges | null {
  return useContext(TabBadgesContext);
}

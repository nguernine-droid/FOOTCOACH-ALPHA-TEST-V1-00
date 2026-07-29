"use client";

import { createContext, useContext } from "react";

/**
 * Point d'entrée de la feuille « Moi » exposé par RoleGuard à la barre
 * d'onglets. Passe par un contexte parce que la barre est fournie en `nav`
 * par le layout du rôle : elle est rendue par RoleGuard sans en être enfant
 * dans le code.
 */
export type AccountEntry = {
  open: () => void;
  /** Feuille ouverte : l'emplacement « Moi » se marque comme actif */
  isOpen: boolean;
  /** Activités non lues : pastille sur l'onglet qui les affiche */
  unread: boolean;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
};

export const AccountSheetContext = createContext<AccountEntry | null>(null);

export function useAccountEntry(): AccountEntry | null {
  return useContext(AccountSheetContext);
}

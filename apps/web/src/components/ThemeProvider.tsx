"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyTheme,
  readThemeChoice,
  resolveTheme,
  systemTheme,
  writeThemeChoice,
  type ResolvedTheme,
  type ThemeChoice,
} from "@/lib/theme";

type ThemeContextValue = {
  /** Ce que le coach a choisi : `system`, `light` ou `dark` */
  choice: ThemeChoice;
  /** Ce qui est réellement affiché */
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Source de vérité du thème pour tout l'arbre React.
 *
 * L'attribut `data-theme` est déjà posé sur `<html>` par le script bloquant du
 * `<head>` : ce fournisseur ne le pose pas une première fois, il prend le
 * relais. Son travail est ailleurs — refléter le choix dans l'état React (pour
 * l'écran de réglage), et suivre `prefers-color-scheme` à chaud tant que le
 * choix vaut `system`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Rendu serveur : on part du défaut. Le premier effet réaligne sur ce que le
  // script du <head> a déjà appliqué — sans repeindre, c'est la même valeur.
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = readThemeChoice();
    setChoiceState(stored);
    setResolved(resolveTheme(stored));
  }, []);

  // Le thème système change en cours de route (coucher du soleil, bascule
  // manuelle de l'OS) : l'app suit, sans rechargement.
  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = systemTheme();
      setResolved(next);
      applyTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    writeThemeChoice(next);
    const target = resolveTheme(next);
    setResolved(target);
    applyTheme(target);
  }, []);

  const value = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme doit être utilisé sous <ThemeProvider>");
  return context;
}

/**
 * Chemin d'un asset décliné par thème, façon `illustration-empty.dark.svg`.
 *
 * À n'employer que pour les fichiers qu'on ne peut pas teinter : images
 * matricielles, logos fournis par un tiers. Pour un SVG écrit ici, les jetons
 * et `currentColor` font le travail sans doubler le fichier — un dessin qui
 * suit le thème vaut mieux que deux dessins à maintenir en parallèle.
 */
export function useThemedAsset(name: string, extension = "svg"): string {
  const { resolved } = useTheme();
  return `/assets/${name}.${resolved}.${extension}`;
}

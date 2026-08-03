/**
 * Thème clair / sombre : stockage, résolution et application.
 *
 * Trois choix possibles, un seul thème rendu :
 *   - `system` (défaut) suit `prefers-color-scheme` et réagit à chaud ;
 *   - `light` / `dark` forcent, et le choix survit au rechargement.
 *
 * Le thème résolu est posé en `data-theme` sur `<html>` — pas sur un div
 * racine : les feuilles modales partent dans `document.body` par un portail,
 * le rebond élastique de la page se peint avec le fond du document, et les
 * contrôles natifs lisent `color-scheme` sur la racine.
 */

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "fc.theme";

export const THEME_LABELS: Record<ThemeChoice, string> = {
  system: "Système",
  light: "Clair",
  dark: "Sombre",
};

/** Couleur de la barre du navigateur, par thème résolu. Doit rester alignée
 *  sur `--browser-chrome` de `tokens.css`. */
const BROWSER_CHROME: Record<ResolvedTheme, string> = {
  light: "#241811",
  dark: "#1C130E",
};

function isChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/** Choix enregistré, ou `system` — y compris si le stockage est inaccessible
 *  (navigation privée verrouillée, cookies bloqués). */
export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function writeThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Un thème non mémorisé reste un thème appliqué : on n'échoue pas dessus.
  }
}

export function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === "system" ? systemTheme() : choice;
}

/**
 * Pose le thème sur le document. Trois choses, et pas une de plus :
 * l'attribut qui commande tous les jetons, la couleur de la barre du
 * navigateur, et le style de la barre d'état iOS.
 */
export function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.theme = resolved;

  const chrome = BROWSER_CHROME[resolved];
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = chrome;

  // iOS ne relit ce réglage qu'au lancement de l'app installée : le mettre à
  // jour ici ne change rien à la session en cours, mais la suivante partira
  // avec la bonne barre d'état.
  const statusBar = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  );
  if (statusBar) statusBar.content = resolved === "dark" ? "black-translucent" : "default";
}

/**
 * Script anti-flash, injecté tel quel dans le `<head>` avant toute feuille de
 * style. Il doit rester minuscule et sans dépendance : il s'exécute de façon
 * bloquante, avant le premier rendu, pour qu'aucun écran ne s'affiche dans le
 * mauvais thème — pas même un seizième de seconde.
 *
 * Écrit à la main plutôt que dérivé des fonctions ci-dessus : il est sérialisé
 * dans le HTML, il ne peut pas les appeler.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var c=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(c!=="light"&&c!=="dark"&&c!=="system")c="system";
var t=c==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):c;
document.documentElement.dataset.theme=t;
var m=document.createElement("meta");m.name="theme-color";
m.content=t==="dark"?${JSON.stringify(BROWSER_CHROME.dark)}:${JSON.stringify(BROWSER_CHROME.light)};
document.head.appendChild(m);
}catch(e){document.documentElement.dataset.theme="light";}})();`;

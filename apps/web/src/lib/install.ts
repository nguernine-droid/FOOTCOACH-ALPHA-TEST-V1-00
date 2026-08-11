"use client";

import { useSyncExternalStore } from "react";

/**
 * Installation de l'application sur l'écran d'accueil, côté navigateur.
 *
 * Les deux systèmes n'offrent PAS la même chose, et c'est la seule raison
 * d'être de ce module :
 *
 * - Chromium (Android, et les navigateurs de bureau) émet `beforeinstallprompt`
 *   quand il juge le site installable. L'intercepter permet d'ouvrir la boîte
 *   d'installation du système depuis NOTRE bouton, en une touche ;
 * - iOS n'expose aucune API d'installation. « Sur l'écran d'accueil » ne part
 *   que de la feuille de partage, par un geste de l'utilisateur. Rien à
 *   déclencher, donc : il ne reste qu'à montrer le geste.
 *
 * Sur iPhone ce n'est pas qu'un confort — les notifications n'y existent que
 * si l'application a été installée (voir `PushAvailability.needs-install`).
 */

/** Événement Chromium, absent des types du DOM standard */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * L'événement ne se produit QU'UNE FOIS par chargement, souvent avant qu'un
 * écran qui s'y intéresse soit monté. On l'attrape donc au niveau du module,
 * dès que le paquet client s'exécute, et on le garde de côté — d'où la variable
 * de module plutôt qu'un état React.
 */
let deferred: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();

function notify() {
  for (const fn of subscribers) fn();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Sans ce `preventDefault`, Chrome pose sa propre bannière en bas de
    // l'écran : deux invitations à installer, dont une qu'on ne contrôle pas.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  // Installée pendant la session : l'offre n'a plus lieu d'être.
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/** L'application tourne-t-elle déjà depuis l'écran d'accueil ? */
function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS n'implémente pas `display-mode` : il a sa propriété à lui.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * iPhone, iPad ou iPod. L'iPad récent se présente comme un Mac de bureau —
 * seul le nombre de points de contact le trahit.
 */
function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Ce qu'on peut proposer ici et maintenant :
 * - `button` : un bouton qui installe, le système fait le reste ;
 * - `ios-tutorial` : le geste à montrer, faute d'API ;
 * - `none` : déjà installée, ou navigateur qui ne sait pas faire. On ne montre
 *   alors RIEN — une invitation sans issue est pire que pas d'invitation.
 */
export type InstallOffer = "button" | "ios-tutorial" | "none";

function currentOffer(): InstallOffer {
  if (isStandalone()) return "none";
  if (deferred) return "button";
  if (isIos()) return "ios-tutorial";
  return "none";
}

function subscribe(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/**
 * L'offre du moment, réévaluée quand l'événement arrive. Le serveur ne peut
 * rien en savoir — il ne connaît ni le système ni l'état d'installation — d'où
 * le `none` rendu côté serveur, corrigé dès l'hydratation.
 */
export function useInstallOffer(): InstallOffer {
  return useSyncExternalStore(
    subscribe,
    currentOffer,
    () => "none" as const,
  );
}

/**
 * Ouvre la boîte d'installation du système. Doit partir d'un geste de
 * l'utilisateur, sans quoi le navigateur l'ignore.
 *
 * Renvoie ce que l'utilisateur a décidé. L'événement n'est utilisable qu'une
 * fois : refusée, l'offre disparaît — insister par un second bouton reviendrait
 * à ne pas entendre le refus.
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

"use client";

import { useEffect } from "react";
// Importé pour son EFFET DE BORD : le module pose l'écoute de
// `beforeinstallprompt` dès qu'il s'exécute. L'événement ne se produit qu'une
// fois par chargement, et souvent avant qu'on arrive sur l'écran qui s'y
// intéresse — l'écoute doit donc vivre à la racine, quelle que soit la page
// d'entrée, pas dans le composant qui affichera l'offre.
import "@/lib/install";
import { registerServiceWorker } from "@/lib/push";

/**
 * Amorçage de tout ce qui doit exister avant qu'on en ait besoin : l'écoute de
 * l'invitation à installer, et le service worker lui-même.
 *
 * Le service worker était jusqu'ici enregistré au moment d'activer les
 * notifications. C'était trop tard pour l'installation : Chrome ne juge une
 * application installable que si un service worker est déjà en place, si bien
 * qu'un coach qui n'avait pas activé les notifications ne se voyait jamais
 * proposer d'installer — et sur iPhone, c'est précisément l'installation qui
 * débloque les notifications. L'ordre était donc circulaire.
 *
 * Enregistré pour tout le monde, visiteurs non connectés compris : le fichier
 * n'affiche que des notifications push et laisse passer les requêtes, il n'a
 * besoin d'aucune session pour être inoffensif.
 */
export function InstallPromptListener() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}

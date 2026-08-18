"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, homeForRole } from "@/lib/api";

/**
 * Renvoie un visiteur DÉJÀ CONNECTÉ vers son espace.
 *
 * La redirection a quitté la page pour ce petit composant, et c'est tout le
 * sujet : tant qu'elle était la page, l'accueil ne rendait rien d'autre qu'un
 * écran d'attente, et l'adresse principale du service n'avait aucun contenu à
 * offrir — ni à un moteur de recherche, ni à quelqu'un qui découvre le nom.
 *
 * Elle ne rend rien : la page est rendue côté serveur et reste affichée. Un
 * coach connecté la voit un instant avant d'être emmené chez lui, ce qui est
 * le prix, très faible, d'une page d'accueil qui existe.
 */
export function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    if (user) router.replace(homeForRole(user.role));
  }, [router]);

  return null;
}

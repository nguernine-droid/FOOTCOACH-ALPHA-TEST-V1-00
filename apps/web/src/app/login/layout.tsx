import type { Metadata } from "next";

/**
 * Un layout pour un seul écran, et uniquement pour ses métadonnées.
 *
 * `login/page.tsx` est un composant client (`"use client"`), et un composant
 * client ne peut pas exporter de `metadata` — Next lit ce champ sur le serveur,
 * avant de rendre quoi que ce soit. Faute de ce fichier, l'écran de connexion
 * héritait du titre et de la description de la racine : « TeamNexus — trouvez
 * un adversaire… », c'est-à-dire la promesse de la vitrine servie à quelqu'un
 * qui cherche à entrer chez lui.
 *
 * Il n'ajoute aucun balisage : rendre `children` tel quel laisse la page
 * exactement comme elle était.
 */
export const metadata: Metadata = {
  title: "Se connecter",
  description:
    "Connectez-vous à votre compte coach TeamNexus pour publier une annonce, répondre à celles de votre secteur et organiser vos matchs amicaux.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

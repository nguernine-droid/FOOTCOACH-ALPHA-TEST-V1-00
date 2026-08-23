import type { Metadata } from "next";

/**
 * Métadonnées de l'écran d'inscription — même raison qu'à la connexion : la
 * page est un composant client et ne peut pas les porter elle-même.
 *
 * C'est la page vers laquelle mène CHAQUE bouton de la vitrine et de la couche
 * publique. Elle mérite mieux qu'un titre hérité : quelqu'un qui cherche
 * « créer un compte TeamNexus » doit tomber ici, et voir en résultat ce qu'il
 * en coûte — rien.
 */
export const metadata: Metadata = {
  title: "Créer un compte coach — gratuit",
  description:
    "Créez votre compte coach TeamNexus en deux minutes : un surnom, une adresse e-mail et votre équipe. Gratuit, sans abonnement ni carte bancaire.",
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}

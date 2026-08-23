import type { Metadata } from "next";

/**
 * Réinitialisation du mot de passe : `noindex`.
 *
 * Contrairement à la connexion et à l'inscription, cette page ne répond à
 * aucune recherche — on n'y arrive que depuis l'écran de connexion, un lien
 * déjà en main. Indexée, elle n'apporterait aucun visiteur et concurrencerait
 * `/login` sur les requêtes autour du compte.
 *
 * `follow` reste vrai : les liens qu'elle porte ramènent vers le site, il n'y a
 * pas de raison de demander à un robot de les ignorer.
 */
export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Recevez un lien pour choisir un nouveau mot de passe sur votre compte TeamNexus.",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}

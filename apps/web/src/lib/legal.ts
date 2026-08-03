/**
 * Où lire les documents contractuels.
 *
 * Ils sont publiés par le site vitrine (dossier `site/` du dépôt), pas par
 * l'application : un seul texte, une seule version en ligne, rien à
 * resynchroniser entre deux déploiements.
 *
 * `NEXT_PUBLIC_SITE_URL` permet de pointer ailleurs — un domaine de recette,
 * ou le serveur statique local (`http://localhost:4173`) pendant qu'on
 * travaille sur les textes.
 *
 * ATTENTION : l'écran d'acceptation énonce lui-même, en clair, ce qui est
 * accepté. Ces liens mènent au texte complet ; ils ne portent pas à eux seuls
 * l'information donnée au coach. C'est voulu — un lien mort ne doit pas pouvoir
 * vider l'acceptation de sa substance.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://footcoach.fr";

export const LEGAL_LINKS = {
  cgu: `${SITE_URL}/cgu.html`,
  privacy: `${SITE_URL}/confidentialite.html`,
  legalNotice: `${SITE_URL}/mentions-legales.html`,
} as const;

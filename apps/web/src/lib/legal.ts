/**
 * L'IDENTITÉ LÉGALE DU SERVICE — la source unique.
 *
 * Les trois pages légales (mentions, CGU, confidentialité) ne contiennent
 * aucune de ces informations en dur : elles les lisent ici. Renseigner le
 * service se fait donc à UN endroit, et une information mise à jour l'est
 * partout d'un coup — l'adresse de contact apparaît dans les trois pages, et
 * trois copies divergentes seraient pires qu'un champ vide.
 *
 * ── Ce que la loi exige ──────────────────────────────────────────────────
 * L'article 6 III de la loi n° 2004-575 du 21 juin 2004 (LCEN) impose de
 * publier l'identité de l'éditeur, celle du directeur de la publication et
 * celle de l'hébergeur. Le RGPD impose en plus l'identité du responsable du
 * traitement, un moyen d'exercer ses droits, et les durées de conservation.
 *
 * Ce qui manque encore vaut `null` : c'est typé, chaque lecture doit traiter
 * le cas, et `legalIsComplete()` en tire de quoi retirer les pages des moteurs
 * de recherche tant que l'obligation n'est pas remplie. Une chaîne
 * « [À COMPLÉTER] » se serait publiée toute seule.
 */

/** Une information légale encore inconnue */
export type Fillable = string | null;

/**
 * ÉDITEUR — personne physique, service non professionnel.
 *
 * TeamNexus est édité par des particuliers et ne tire aucun revenu de son
 * activité. L'article 6 III 2° de la LCEN dispense l'éditeur non professionnel
 * personne physique de publier son adresse postale, À LA CONDITION d'avoir
 * communiqué ses éléments d'identification à son hébergeur — ce que le contrat
 * IONOS établit — et de publier le nom de celui-ci, ce que fait la section 3
 * des mentions légales.
 *
 * Cette dispense TOMBE si le service devient professionnel, c'est-à-dire dès
 * qu'il génère un revenu, même accessoire. Une offre payante, un partenariat
 * ou de la publicité obligeraient à publier une adresse complète et une
 * immatriculation.
 */
export const EDITOR = {
  name: "Rafaël DUONG",
  /** Personne physique : ni forme sociale, ni capital */
  legalForm: null as Fillable,
  /** Non publiée — dispense LCEN 6 III 2°, voir le commentaire ci-dessus */
  address: null as Fillable,
  /** Pas d'immatriculation : activité non professionnelle */
  registration: null as Fillable,
  /** Non assujetti à la TVA */
  vat: null as Fillable,
  phone: null as Fillable,
  /** Éditeur non professionnel personne physique au sens de la LCEN */
  isNonProfessionalIndividual: true,
} as const;

/**
 * Les deux personnes qui répondent du contenu publié. La loi vise un directeur
 * de la publication au singulier ; deux noms se lisent ici comme une
 * co-responsabilité assumée, ce qui n'enlève rien à l'obligation et ne trompe
 * personne sur qui joindre.
 */
export const PUBLICATION_DIRECTORS = ["Rafaël DUONG", "Nordine GUERNINE"] as const;

export const CONTACT = {
  /**
   * Adresse générale : questions, réclamations, exercice des droits RGPD.
   *
   * Elle ne peut PAS être remplacée par le canal de signalement intégré à
   * l'application : celui-ci exige un compte de coach, alors qu'une demande
   * d'effacement, un signalement de contenu illicite ou une simple question
   * peuvent venir de quelqu'un qui n'en a pas — et le RGPD comme la LCEN
   * s'adressent à tout le monde, pas aux seuls inscrits.
   */
  email: null as Fillable,
  /** Signalement de contenus illicites — à défaut, `email` fait l'office */
  abuseEmail: null as Fillable,
  /** Délégué à la protection des données : non désigné, non requis ici */
  dpo: null as Fillable,
} as const;

/**
 * HÉBERGEUR — IONOS.
 *
 * L'entité et l'adresse ci-dessous sont celles de la filiale française du
 * groupe, publiques et vérifiables. À confirmer sur la facture : un contrat
 * souscrit directement auprès de la maison mère relèverait d'IONOS SE
 * (Elgendorfer Straße 57, 56410 Montabaur, Allemagne), et c'est alors ce nom
 * qu'il faudrait publier.
 */
export const HOST = {
  name: "IONOS SARL",
  address: "7 place de la Gare, BP 70109, 57200 Sarreguemines Cedex, France",
  phone: null as Fillable,
  /** Pays du centre de données — à confirmer dans la console IONOS */
  country: null as Fillable,
} as const;

/**
 * DURÉES DE CONSERVATION.
 *
 * Écrites d'après ce que le code fait RÉELLEMENT, et non d'après ce qu'il
 * serait souhaitable qu'il fasse : il n'existe aujourd'hui aucun travail de
 * purge dans l'API — ni pour l'historique des matchs, ni pour le journal des
 * connexions. Annoncer « douze mois » serait une promesse que rien ne tient,
 * et une politique de confidentialité qui ment sur ce point est pire qu'une
 * politique qui assume une conservation longue.
 *
 * Le jour où une purge sera écrite, ces deux phrases devront changer AVANT sa
 * mise en service, pas après.
 */
export const RETENTION = {
  history:
    "Tant que votre compte existe. Aucune suppression automatique n'est appliquée : " +
    "l'historique disparaît avec le compte, à votre demande.",
  loginLog:
    "Tant que votre compte existe, puis effacé avec lui. Aucune purge périodique n'est " +
    "appliquée à ce jour.",
} as const;

/**
 * Le service peut-il se dire identifié ?
 *
 * Ne teste que ce qui est ici OBLIGATOIRE. L'adresse de l'éditeur n'y figure
 * pas : la dispense de la LCEN s'applique (voir `EDITOR`). Reste ce dont
 * personne ne peut être dispensé — savoir qui édite, qui répond du contenu,
 * qui héberge, et par où joindre un humain.
 */
export function legalIsComplete(): boolean {
  return [EDITOR.name, PUBLICATION_DIRECTORS[0], HOST.name, HOST.address, CONTACT.email].every(
    (value) => typeof value === "string" && value.length > 0,
  );
}

/**
 * Où lire les documents contractuels.
 *
 * ── Ce qui a changé, et pourquoi ─────────────────────────────────────────
 * Ces liens pointaient vers `teamnexus.fr/cgu.html` & consorts, c'est-à-dire
 * vers le site statique du dossier `site/` — lequel n'est servi par aucun
 * service du `docker-compose`. Autrement dit : l'écran d'acceptation renvoyait
 * vers des pages qui n'existaient pas à cette adresse, et le coach qui voulait
 * lire ce qu'il acceptait tombait sur une erreur.
 *
 * Ils désignent désormais les routes de l'application elle-même. Chemins
 * relatifs : le document est servi par le même domaine que l'écran qui le
 * cite, il n'y a plus rien à resynchroniser entre deux déploiements.
 *
 * ATTENTION : l'écran d'acceptation énonce lui-même, en clair, ce qui est
 * accepté. Ces liens mènent au texte complet ; ils ne portent pas à eux seuls
 * l'information donnée au coach. C'est voulu — un lien mort ne doit pas pouvoir
 * vider l'acceptation de sa substance.
 */
export const LEGAL_LINKS = {
  cgu: "/cgu",
  privacy: "/confidentialite",
  legalNotice: "/mentions-legales",
} as const;

/** Dates et versions affichées en tête de chaque document */
export const LEGAL_VERSIONS = {
  mentions: { updated: "18 août 2026", version: "2" },
  cgu: { updated: "14 août 2026", version: "3" },
  privacy: { updated: "18 août 2026", version: "4" },
} as const;

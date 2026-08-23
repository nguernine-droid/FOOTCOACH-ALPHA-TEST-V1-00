import { categoryLabel, type PublicAnnouncementDto } from "@teamnexus/shared";
import { CONTACT } from "@/lib/legal";
import { siteUrl } from "@/lib/publicApi";

/**
 * ————— CE QU'UN MOTEUR COMPREND DU SITE —————
 *
 * Les balises `title` et `description` disent de quoi parle UNE page. Elles ne
 * disent pas ce qu'est le service, qui l'édite, ni comment les pages
 * s'emboîtent — trois questions qu'un moteur se pose pourtant avant de décider
 * s'il affiche un logo, un fil d'Ariane ou une simple ligne bleue.
 *
 * Ce module produit les réponses, en JSON-LD. Elles sont écrites ICI et nulle
 * part ailleurs : le nom du service, son adresse et son logo apparaissent
 * autrement dans quatre gabarits, et quatre copies divergentes valent moins que
 * pas de balisage du tout — un moteur qui lit deux identités contradictoires
 * n'en retient aucune.
 *
 * ── Ce qu'on ne déclare pas ──────────────────────────────────────────────
 * Ni note moyenne, ni nombre d'avis, ni prix barré. Ces propriétés font de
 * jolies étoiles dans les résultats et sont la première chose qu'on est tenté
 * d'inventer ; elles sont aussi la première chose que Google sanctionne quand
 * la page ne les montre nulle part. La règle de la vitrine — rien qui ne soit
 * vrai et vérifiable à l'écran — vaut pour le balisage comme pour le texte.
 */

/** Identifiants stables du graphe : c'est par eux que les nœuds se citent */
const orgId = () => `${siteUrl()}/#organisation`;
const siteId = () => `${siteUrl()}/#site`;

const TAGLINE =
  "L'application des coachs de football amateur pour trouver un adversaire et organiser leurs matchs amicaux.";

/**
 * L'éditeur, comme entité. C'est ce nœud qui rend un logo éligible à côté du
 * lien dans les résultats, et c'est lui que les autres citent par `@id` au lieu
 * de se répéter.
 *
 * `Organization` plutôt que `Person` bien que le service soit édité par des
 * particuliers (voir `legal.ts`) : ce qui est référencé est un service, pas une
 * personne, et un moteur qui rattache la marque à un individu affiche son nom
 * là où on attend celui de l'application.
 */
export function organizationNode() {
  const base = siteUrl();
  return {
    "@type": "Organization",
    "@id": orgId(),
    name: "TeamNexus",
    alternateName: "TeamNexus — matchs amicaux",
    url: base,
    description: TAGLINE,
    // 512 × 512, servi par `app/icon.png` : Google demande une image d'au
    // moins 112 px de côté et refuse les SVG.
    logo: { "@type": "ImageObject", url: `${base}/icon.png`, width: 512, height: 512 },
    ...(CONTACT.email ? { email: CONTACT.email } : {}),
    areaServed: { "@type": "Country", name: "France" },
    // `sameAs` reste absent tant qu'il n'y a aucun profil officiel ailleurs :
    // un tableau vide n'apprend rien, et y mettre une page tierce non tenue par
    // l'éditeur reviendrait à revendiquer ce qu'on ne maîtrise pas.
  };
}

/** Le site lui-même — la racine à laquelle chaque page se rattache. */
export function webSiteNode() {
  return {
    "@type": "WebSite",
    "@id": siteId(),
    url: siteUrl(),
    name: "TeamNexus",
    description: TAGLINE,
    inLanguage: "fr-FR",
    publisher: { "@id": orgId() },
  };
}

/**
 * Le produit : une application web gratuite, installable.
 *
 * `offers` à zéro euro n'est pas une coquetterie — c'est la seule façon de dire
 * « gratuit » dans un vocabulaire qu'un moteur comprend, et « c'est vraiment
 * gratuit ? » est la première question de la FAQ. Sans ce nœud, la réponse
 * n'existe que dans une phrase française qu'il faut lire.
 */
export function softwareApplicationNode() {
  const base = siteUrl();
  return {
    "@type": "SoftwareApplication",
    name: "TeamNexus",
    url: base,
    applicationCategory: "SportsApplication",
    applicationSubCategory: "Organisation de matchs amicaux de football",
    operatingSystem: "Web, iOS, Android",
    inLanguage: "fr-FR",
    description: TAGLINE,
    publisher: { "@id": orgId() },
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
    featureList: [
      "Radar des annonces de matchs amicaux autour de soi",
      "Publication d'annonces par catégorie d'âge et par date",
      "Mise en relation et validation du match par les deux coachs",
      "Feuille de match et score validé au QR code",
      "Alertes SOS quand un adversaire se désiste",
    ],
  };
}

/**
 * Le fil d'Ariane, pour un moteur.
 *
 * Il ne sert pas à naviguer — la page porte déjà ses liens — mais à remplacer,
 * sous le titre du résultat, l'URL brute par le chemin lisible qui y mène.
 * `teamnexus.fr › Annonces › Rhône` se comprend d'un coup d'œil là où
 * `teamnexus.fr/f/rhone-69` demande un effort.
 *
 * Les chemins sont RELATIFS à la racine (« /f/rhone-69 ») : le domaine est
 * ajouté ici, une fois, comme le fait `metadataBase` pour les canoniques.
 */
export function breadcrumbNode(trail: { name: string; path: string }[]) {
  const base = siteUrl();
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: `${base}${step.path}`,
    })),
  };
}

/**
 * Assemble les nœuds en un seul bloc.
 *
 * Un `@graph` plutôt que plusieurs balises `script` : les nœuds se citent entre
 * eux par `@id`, et un moteur ne rapproche des blocs séparés que s'il le veut
 * bien. Groupés, la relation est explicite.
 */
export function jsonLdGraph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/**
 * Les annonces d'une page, comme événements sportifs.
 *
 * Il dit à un moteur que ces lignes sont des rencontres DATÉES et SITUÉES, ce
 * qu'aucun paragraphe ne lui apprendra — c'est ce qui rend la page éligible aux
 * résultats enrichis, où la date et le lieu s'affichent sous le lien.
 *
 * Écrit ici plutôt que dans le gabarit qui l'emploie parce que deux pages
 * montrent les mêmes annonces : l'index `/f` et les tableaux par département.
 * Deux mappages recopiés auraient fini par décrire différemment les mêmes
 * rencontres.
 *
 * Le lieu s'arrête à la commune, comme le reste de la couche publique : le
 * terrain exact n'en sort pas plus ici qu'ailleurs (voir PublicAnnouncementDto).
 */
export function sportsEventListNode(name: string, announcements: PublicAnnouncementDto[]) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: announcements.length,
    itemListElement: announcements.map((a, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SportsEvent",
        name: `Match amical ${categoryLabel(a.category)} — ${a.teamName}`,
        sport: "Football",
        startDate: `${a.date}T${a.time}:00`,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: a.city,
          address: { "@type": "PostalAddress", addressLocality: a.city, addressCountry: "FR" },
        },
        organizer: { "@type": "SportsTeam", name: a.teamName },
      },
    })),
  };
}

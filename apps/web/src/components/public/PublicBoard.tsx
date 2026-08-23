import Link from "next/link";
import {
  categoryLabel,
  categorySlug,
  type PublicBoardDto,
  type PublicDistrictDto,
} from "@teamnexus/shared";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbNode, jsonLdGraph, sportsEventListNode } from "@/lib/seo";
import { PublicAnnouncementCard } from "@/components/public/PublicAnnouncementCard";

/** Combien d'autres départements le pied de page propose — voir plus bas */
const NEIGHBOURS_SHOWN = 12;

/**
 * Le corps d'une page publique de département, avec ou sans catégorie.
 *
 * Partagé par les deux routes plutôt que recopié : la page « département » et
 * la page « département + catégorie » montrent exactement la même chose, à un
 * filtre près, et les laisser diverger produirait deux pages indexées qui ne se
 * ressemblent plus.
 *
 * Chaque annonce mène à la connexion et non à sa fiche : la fiche exige un
 * compte, et envoyer un visiteur sur un mur d'authentification sans le prévenir
 * est le meilleur moyen de le perdre.
 */
export async function PublicBoard({
  board,
  others = [],
}: {
  board: PublicBoardDto;
  /** Les autres départements actifs, pour le maillage de bas de page */
  others?: PublicDistrictDto[];
}) {
  const { district, category, announcements } = board;

  /**
   * Le chemin qui mène ici, tel qu'un moteur doit le lire.
   *
   * Ce n'est pas un doublon du fil d'Ariane visible quelques lignes plus bas :
   * celui-ci sert à naviguer, celui-là remplace l'URL brute sous le titre du
   * résultat de recherche. « teamnexus.fr › Annonces › Rhône › U15 » se
   * comprend d'un coup d'œil là où « /f/rhone-69/u15 » demande un effort.
   */
  const trail = [
    { name: "Accueil", path: "/" },
    { name: "Annonces de matchs amicaux", path: "/f" },
    { name: district.label, path: `/f/${district.slug}` },
    ...(category
      ? [{ name: categoryLabel(category), path: `/f/${district.slug}/${categorySlug(category)}` }]
      : []),
  ];

  const eventList = sportsEventListNode(
    `Matchs amicaux ${category ? categoryLabel(category) + " " : ""}— ${district.label}`,
    announcements,
  );

  /**
   * Le fil d'Ariane est balisé MÊME sans annonce : il décrit la place de la
   * page dans le site, ce qui reste vrai un jour où personne ne cherche de
   * match. La liste d'événements, elle, ne s'écrit que s'il y en a — une liste
   * vide annoncerait des résultats enrichis introuvables.
   */
  const structuredData =
    announcements.length > 0
      ? jsonLdGraph(breadcrumbNode(trail), eventList)
      : jsonLdGraph(breadcrumbNode(trail));

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <JsonLd data={structuredData} />
      <div className="space-y-2">
        <p className="text-xs text-ink-soft">
          <Link href="/f" className="underline">
            Tous les départements
          </Link>
          {category && (
            <>
              {" · "}
              <Link href={`/f/${district.slug}`} className="underline">
                {district.label}
              </Link>
            </>
          )}
        </p>
        <h1 className="display text-3xl">
          Matchs amicaux {category ? categoryLabel(category) : ""} — {district.label}
        </h1>
        <p className="text-sm text-ink-soft max-w-[60ch]">
          {announcements.length === 0
            ? "Aucune équipe ne cherche d'adversaire ici en ce moment."
            : `${announcements.length} équipe${announcements.length > 1 ? "s" : ""} cherche${
                announcements.length > 1 ? "nt" : ""
              } un adversaire.`}{" "}
          La consultation est libre ; un compte n&apos;est nécessaire que pour répondre.
        </p>
      </div>

      {/* Les catégories du département : c'est le maillage qui fait vivre les
          pages entre elles, et ce par quoi un moteur les découvre. */}
      {district.categories.length > 1 && (
        <nav className="flex flex-wrap gap-2" aria-label="Catégories du département">
          <Link
            href={`/f/${district.slug}`}
            className={category === null ? "chip bg-blue text-white" : "chip bg-paper text-ink-soft"}
          >
            Toutes ({district.announcements})
          </Link>
          {district.categories.map((entry) => (
            <Link
              key={entry.category}
              href={`/f/${district.slug}/${categorySlug(entry.category)}`}
              className={
                category === entry.category ? "chip bg-blue text-white" : "chip bg-paper text-ink-soft"
              }
            >
              {categoryLabel(entry.category)} ({entry.count})
            </Link>
          ))}
        </nav>
      )}

      {announcements.length > 0 && (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <PublicAnnouncementCard key={a.id} announcement={a} />
          ))}
        </ul>
      )}

      <div className="card p-5 space-y-3">
        <p className="font-bold text-sm">Vous encadrez une équipe ?</p>
        <p className="text-xs text-ink-soft max-w-[55ch]">
          Créez un compte pour répondre à ces annonces, publier les vôtres, et déclarer les dates où votre équipe est
          libre — les équipes libres en face vous sont alors proposées.
        </p>
        <Link
          href="/register"
          className="btn btn-primary inline-flex items-center justify-center gap-2 font-bold rounded-lg
            px-6 py-3.5 text-sm min-h-13"
        >
          Créer un compte coach
        </Link>
      </div>

      {/* ————— Ailleurs en ce moment —————

          Une page de département n'avait jusqu'ici qu'UN lien sortant vers le
          reste du site : « Tous les départements », tout en haut. Un moteur
          arrivé par une recherche de longue traîne (« match amical U13 Rhône »)
          repartait donc aussitôt, et les autres départements ne se
          découvraient que par le plan du site.

          Ces liens changent cela des deux côtés : le robot circule, et le coach
          qui ne trouve rien chez lui va voir à côté plutôt que de fermer
          l'onglet — un match amical se joue très bien à quarante kilomètres.

          Le nombre est borné : cent liens en pied de page diluent chacun
          d'eux, et les départements arrivent déjà triés par activité. */}
      {others.length > 0 && (
        <nav className="space-y-3 pt-2" aria-label="Autres départements">
          <h2 className="display text-lg">Ailleurs en ce moment</h2>
          <ul className="flex flex-wrap gap-2">
            {others.slice(0, NEIGHBOURS_SHOWN).map((other) => (
              <li key={other.code}>
                <Link href={`/f/${other.slug}`} className="chip bg-paper text-ink-soft">
                  {other.label} ({other.announcements})
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

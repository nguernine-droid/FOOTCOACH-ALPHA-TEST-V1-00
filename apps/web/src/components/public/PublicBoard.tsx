import { headers } from "next/headers";
import Link from "next/link";
import { categoryLabel, categorySlug, type PublicBoardDto } from "@teamnexus/shared";
import { PublicAnnouncementCard } from "@/components/public/PublicAnnouncementCard";

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
export async function PublicBoard({ board }: { board: PublicBoardDto }) {
  const { district, category, announcements } = board;

  /**
   * Le nonce de la politique de contenu, posé par le proxy à chaque requête.
   *
   * Un bloc `application/ld+json` ne s'exécute pas, mais il reste un élément
   * `script` : sous une politique en `strict-dynamic`, les navigateurs sont
   * en droit de le refuser, et le balisage disparaîtrait sans bruit — le pire
   * des cas pour une donnée dont personne ne vérifie la présence à l'œil nu.
   */
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  /**
   * Balisage schema.org des annonces.
   *
   * Il dit à un moteur que ces lignes sont des ÉVÉNEMENTS SPORTIFS datés et
   * situés, ce qu'aucun paragraphe ne lui apprendra. C'est ce qui rend la page
   * éligible aux résultats enrichis, où une date et un lieu s'affichent sous le
   * lien.
   *
   * Le lieu s'arrête à la commune, comme le reste de la page : le terrain exact
   * n'en sort pas plus ici qu'ailleurs (voir PublicAnnouncementDto).
   */
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
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

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      {announcements.length > 0 && (
        <script
          type="application/ld+json"
          nonce={nonce}
          // Sérialisé par nous, jamais saisi par un utilisateur : les valeurs
          // viennent de colonnes contrôlées, et JSON.stringify échappe le reste.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
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
    </div>
  );
}

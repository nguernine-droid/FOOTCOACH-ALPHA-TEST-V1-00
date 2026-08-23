import type { Metadata } from "next";
import Link from "next/link";
import { fetchDistricts, fetchLatestAnnouncements } from "@/lib/publicApi";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbNode, jsonLdGraph, sportsEventListNode } from "@/lib/seo";
import { PublicAnnouncementCard } from "@/components/public/PublicAnnouncementCard";
import { VButtonLink, VCard } from "@/components/public/primitives";

// Next exige une valeur LITTÉRALE ici : il lit ce champ statiquement, sans
// exécuter le module, et une constante importée le laisse sans réponse. Elle
// vaut PUBLIC_REVALIDATE_SECONDS — les deux se lisent, mais seule celle-ci
// s'applique.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Matchs amicaux de football — les annonces en cours",
  description:
    "Les équipes de football amateur qui cherchent un adversaire pour un match amical. Consultation libre, sans compte.",
  alternates: { canonical: "/f" },
};

/**
 * L'aperçu public : les prochaines annonces, tout de suite.
 *
 * ── Pourquoi des annonces et non des départements ───────────────────────
 * Cette page est ce qu'on atteint depuis « Voir les annonces ». Elle montrait
 * jusqu'ici la liste des départements actifs : un visiteur devait donc choisir
 * une zone AVANT de voir le moindre match, c'est-à-dire décider quelque chose
 * avant de savoir de quoi il s'agit. Les annonces passent devant ; les
 * départements restent, en dessous.
 *
 * Aucun filtre, volontairement : trier suppose de savoir ce qu'on cherche, et
 * quelqu'un qui découvre le service ne le sait pas encore. Le tri fin vit dans
 * l'application, sur le radar, une fois le compte créé.
 *
 * ── Le maillage reste ───────────────────────────────────────────────────
 * Les liens par département en bas de page ne sont pas décoratifs : ce sont eux
 * qui font découvrir les pages `/f/[district]` aux moteurs, et ces pages sont
 * la seule couche du site qui rapporte des visiteurs dans la durée. Les retirer
 * pour « simplifier » couperait la branche.
 */
export default async function PublicIndexPage() {
  const [announcements, districts] = await Promise.all([fetchLatestAnnouncements(), fetchDistricts()]);
  const total = districts?.reduce((sum, d) => sum + d.announcements, 0) ?? 0;
  const shown = announcements?.length ?? 0;

  /**
   * Cette page montre des annonces : elle les balise, exactement comme les
   * tableaux par département. Sans cela, l'entrée de la couche publique — celle
   * que le plan du site déclare en « quotidienne » et que les liens partagés
   * atteignent le plus souvent — était la seule à ne rien dire de son contenu.
   *
   * Le fil d'Ariane est posé même quand la liste est vide : il décrit la place
   * de la page dans le site, ce qui reste vrai un jour sans annonce.
   */
  const trail = [
    { name: "Accueil", path: "/" },
    { name: "Annonces de matchs amicaux", path: "/f" },
  ];
  const structuredData =
    shown > 0
      ? jsonLdGraph(
          breadcrumbNode(trail),
          sportsEventListNode("Matchs amicaux à venir en France", announcements ?? []),
        )
      : jsonLdGraph(breadcrumbNode(trail));

  return (
    <div className="max-w-[820px] mx-auto space-y-8">
      <JsonLd data={structuredData} />
      <div className="space-y-3">
        <h1 className="display text-3xl md:text-4xl leading-[0.95] text-primary">
          Qui cherche un match en ce moment ?
        </h1>
        <p className="text-sm md:text-base text-secondary max-w-[62ch] leading-relaxed">
          Les équipes de football amateur qui cherchent un adversaire, les plus proches dans le temps
          d&apos;abord. La consultation est libre ; un compte n&apos;est nécessaire que pour répondre à une
          annonce.
        </p>
      </div>

      {announcements === null ? (
        <VCard className="p-5">
          <p className="text-sm text-secondary">
            La liste est momentanément indisponible. Revenez dans quelques instants.
          </p>
        </VCard>
      ) : shown === 0 ? (
        <VCard className="p-6 space-y-3">
          <p className="text-sm font-bold text-primary">Aucune annonce ouverte en ce moment.</p>
          <p className="text-sm text-secondary max-w-[55ch]">
            Les annonces passées ne restent pas affichées. Créez un compte pour publier la vôtre : elle
            apparaîtra ici et sur le radar des coachs de votre secteur.
          </p>
          <VButtonLink href="/register">Créer un compte coach</VButtonLink>
        </VCard>
      ) : (
        <>
          <ul className="space-y-3">
            {announcements.map((a) => (
              <PublicAnnouncementCard key={a.id} announcement={a} />
            ))}
          </ul>

          {/* Ne s'affiche que s'il y a vraiment plus à voir : annoncer « et
              d'autres » quand la liste est complète serait une promesse vide. */}
          {total > shown && (
            <p className="text-xs text-muted">
              {shown} annonces affichées sur {total} ouvertes. Les autres se trouvent par département,
              ci-dessous.
            </p>
          )}
        </>
      )}

      <VCard className="p-6 space-y-3">
        <p className="font-bold text-sm text-primary">Vous encadrez une équipe ?</p>
        <p className="text-sm text-secondary max-w-[58ch] leading-relaxed">
          Créez un compte pour répondre à ces annonces, publier les vôtres, et déclarer les dates où votre
          équipe est libre — les équipes libres en face vous sont alors proposées.
        </p>
        <VButtonLink href="/register">Créer un compte coach</VButtonLink>
      </VCard>

      {districts && districts.length > 0 && (
        <section className="space-y-3" aria-label="Annonces par département">
          <h2 className="display text-xl text-primary">Par département</h2>
          <ul className="flex flex-wrap gap-2">
            {districts.map((district) => (
              <li key={district.code}>
                <Link href={`/f/${district.slug}`} className="v-chip v-lift inline-flex min-h-11 px-4">
                  {district.label} ({district.announcements})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryFromSlug, categoryLabel, districtCodeFromSlug } from "@teamnexus/shared";
import { fetchBoard } from "@/lib/publicApi";
import { PublicBoard } from "@/components/public/PublicBoard";

// Next exige une valeur LITTÉRALE ici : il lit ce champ statiquement, sans
// exécuter le module, et une constante importée le laisse sans réponse. Elle
// vaut PUBLIC_REVALIDATE_SECONDS — les deux se lisent, mais seule celle-ci
// s'applique.
export const revalidate = 300;

type Params = { params: Promise<{ district: string; categorie: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { district, categorie } = await params;
  const code = districtCodeFromSlug(district);
  const category = categoryFromSlug(categorie);
  if (!code || !category) return { title: "Page inconnue — TeamNexus" };
  const board = await fetchBoard(code, categorie);
  if (!board) return { title: "Page inconnue — TeamNexus" };

  const count = board.announcements.length;
  const label = categoryLabel(category);
  const title = `Matchs amicaux ${label} — ${board.district.label}`;
  const description =
    count > 0
      ? `${count} équipe${count > 1 ? "s" : ""} ${label} cherche${count > 1 ? "nt" : ""} un adversaire dans le département ${board.district.label}.`
      : `Les équipes ${label} qui cherchent un adversaire dans le département ${board.district.label}.`;
  return {
    title: `${title} | TeamNexus`,
    description,
    alternates: { canonical: `/f/${board.district.slug}/${categorie.toLowerCase()}` },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

/**
 * Un département borné à une catégorie d'âge — la page la plus précise, et
 * celle qui répond exactement à ce qu'un coach tape dans un moteur : « match
 * amical U13 Rhône ».
 */
export default async function DistrictCategoryPage({ params }: Params) {
  const { district, categorie } = await params;
  const code = districtCodeFromSlug(district);
  const category = categoryFromSlug(categorie);
  if (!code || !category) notFound();

  const board = await fetchBoard(code, categorie);
  if (!board) notFound();

  return <PublicBoard board={board} />;
}

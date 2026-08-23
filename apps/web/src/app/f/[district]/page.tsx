import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { districtCodeFromSlug } from "@teamnexus/shared";
import { fetchBoard, fetchDistricts } from "@/lib/publicApi";
import { PublicBoard } from "@/components/public/PublicBoard";

// Next exige une valeur LITTÉRALE ici : il lit ce champ statiquement, sans
// exécuter le module, et une constante importée le laisse sans réponse. Elle
// vaut PUBLIC_REVALIDATE_SECONDS — les deux se lisent, mais seule celle-ci
// s'applique.
export const revalidate = 300;

type Params = { params: Promise<{ district: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { district } = await params;
  const code = districtCodeFromSlug(district);
  if (!code) return { title: "Département inconnu" };
  const board = await fetchBoard(code);
  if (!board) return { title: "Département inconnu" };

  const count = board.announcements.length;
  const title = `Matchs amicaux de football — ${board.district.label}`;
  const description =
    count > 0
      ? `${count} équipe${count > 1 ? "s" : ""} de football amateur cherche${count > 1 ? "nt" : ""} un adversaire dans le département ${board.district.label}. Consultation libre.`
      : `Les équipes de football amateur qui cherchent un adversaire dans le département ${board.district.label}.`;
  return {
    title,
    description,
    alternates: { canonical: `/f/${board.district.slug}` },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

/**
 * Un département. Le slug porte le nom ET le code (« rhone-69 »), mais seul le
 * code est relu : une URL partagée avec un nom mal orthographié doit continuer
 * de mener à la bonne page.
 */
export default async function DistrictPage({ params }: Params) {
  const { district } = await params;
  const code = districtCodeFromSlug(district);
  if (!code) notFound();

  // Les deux appels partent ensemble : la liste des départements sert le
  // maillage de bas de page, elle ne doit pas retarder l'affichage du tableau.
  const [board, districts] = await Promise.all([fetchBoard(code), fetchDistricts()]);
  if (!board) notFound();

  return (
    <PublicBoard
      board={board}
      others={(districts ?? []).filter((d) => d.code !== board.district.code)}
    />
  );
}

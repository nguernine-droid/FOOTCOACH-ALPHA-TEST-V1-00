import type { Metadata } from "next";
import Link from "next/link";
import { fetchDistricts } from "@/lib/publicApi";

// Next exige une valeur LITTÉRALE ici : il lit ce champ statiquement, sans
// exécuter le module, et une constante importée le laisse sans réponse. Elle
// vaut PUBLIC_REVALIDATE_SECONDS — les deux se lisent, mais seule celle-ci
// s'applique.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Matchs amicaux de football par département — TeamNexus",
  description:
    "Les équipes de football amateur qui cherchent un adversaire, département par département. Consultation libre, sans compte.",
  alternates: { canonical: "/f" },
};

/**
 * L'index public : les départements où des équipes cherchent un adversaire.
 *
 * Un département sans annonce ouverte n'y figure pas. Une page vide indexée
 * dessert plus qu'elle ne sert — elle apprend au moteur que le site répond mal
 * à la question qu'on lui pose — et elle reviendra d'elle-même dès qu'un coach
 * y publiera.
 */
export default async function PublicIndexPage() {
  const districts = await fetchDistricts();

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="display text-3xl">Qui cherche un match, près de chez vous ?</h1>
        <p className="text-sm text-ink-soft max-w-[60ch]">
          Les équipes de football amateur qui cherchent un adversaire pour un match amical, département par
          département. La consultation est libre ; un compte n&apos;est nécessaire que pour répondre à une annonce.
        </p>
      </div>

      {!districts ? (
        <p className="text-sm text-ink-soft bg-paper rounded-lg px-4 py-3">
          La liste est momentanément indisponible. Revenez dans quelques instants.
        </p>
      ) : districts.length === 0 ? (
        <p className="text-sm text-ink-soft bg-paper rounded-lg px-4 py-3">
          Aucune annonce ouverte en ce moment.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {districts.map((district) => (
            <li key={district.code}>
              <Link
                href={`/f/${district.slug}`}
                className="card p-4 flex items-center justify-between gap-3 transition hover:border-blue/40"
              >
                <span className="min-w-0">
                  <span className="block font-bold text-sm truncate">{district.label}</span>
                  <span className="block text-xs text-ink-soft">
                    {district.categories
                      .slice(0, 3)
                      .map((c) => c.category)
                      .join(" · ")}
                  </span>
                </span>
                <span className="chip bg-blue-soft text-primary shrink-0 tabular-nums">
                  {district.announcements}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

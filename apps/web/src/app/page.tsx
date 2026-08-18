import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, MapPinned, Radar, ShieldCheck } from "lucide-react";
import { fetchDistricts } from "@/lib/publicApi";
import { HomeRedirect } from "./HomeRedirect";

// Recalculée toutes les cinq minutes : les chiffres affichés viennent de la
// base, et une page d'accueil qui annonce « 0 annonce » pendant une journée
// entière fait plus de mal que de bien.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "TeamNexus — trouvez un adversaire pour votre prochain match amical",
  description:
    "L'application des coachs de football amateur pour organiser leurs matchs amicaux : déclarez vos dates libres, les équipes libres en face vous sont proposées. Gratuit.",
  alternates: { canonical: "/" },
};

/**
 * La page d'accueil publique.
 *
 * Elle n'existait pas : l'adresse principale du service renvoyait vers l'écran
 * de connexion, en JavaScript. Quelqu'un qui cherchait le nom du service
 * tombait donc sur un formulaire, et un robot d'indexation sur une page vide —
 * le nom de domaine lui-même n'avait aucun contenu à offrir.
 *
 * Rendue côté serveur, sans aucune donnée personnelle : ce qu'elle montre est
 * ce que montre déjà la couche publique — combien de départements ont des
 * annonces en cours, et rien d'autre.
 */
export default async function Home() {
  const districts = await fetchDistricts();
  const announcements = districts?.reduce((sum, d) => sum + d.announcements, 0) ?? 0;
  const busiest = districts?.slice(0, 6) ?? [];

  return (
    <div className="min-h-dvh flex flex-col">
      <HomeRedirect />

      <header className="border-b border-line">
        <div className="max-w-[900px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <span className="display text-xl text-primary">
            TEAM<span className="text-pitch">NEXUS</span>
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-bold text-ink-soft px-3 py-2 min-h-11 flex items-center">
              Se connecter
            </Link>
            <Link
              href="/register"
              className="btn btn-primary inline-flex items-center justify-center gap-2 font-bold rounded-lg
                px-5 py-2.5 text-sm min-h-11 min-[960px]:min-h-0"
            >
              Créer un compte
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-[900px] mx-auto px-4 py-10 space-y-6">
          <div className="space-y-4">
            <h1 className="display text-4xl min-[640px]:text-5xl leading-tight">
              Trouvez un adversaire pour votre prochain match amical.
            </h1>
            <p className="text-base text-ink-soft max-w-[55ch]">
              TeamNexus réunit les coachs de football amateur qui cherchent à jouer. Déclarez les dates où votre
              équipe est libre : les équipes libres en face vous sont proposées, avec leur catégorie, leur niveau et
              la distance réelle jusqu&apos;à leur terrain.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="btn btn-primary inline-flex items-center justify-center gap-2 font-bold rounded-lg
                  px-6 py-4 text-[17px] min-h-14"
              >
                Créer un compte coach
              </Link>
              <Link
                href="/f"
                className="btn btn-soft inline-flex items-center justify-center gap-2 font-bold rounded-lg
                  px-6 py-4 text-[17px] min-h-14"
              >
                Voir les annonces en cours
              </Link>
            </div>
            <p className="text-xs text-ink-faint">
              Gratuit, sans engagement. La consultation des annonces ne demande même pas de compte.
            </p>
          </div>

          {/* Les chiffres réels, ou rien. Une page d'accueil qui annonce des
              milliers d'équipes quand la base en compte quarante se retourne
              contre celui qui l'écrit dès la première visite. */}
          {announcements > 0 && districts && (
            <p className="text-sm font-semibold text-ink-soft bg-paper rounded-lg px-4 py-3">
              {announcements} annonce{announcements > 1 ? "s" : ""} en cours dans {districts.length} département
              {districts.length > 1 ? "s" : ""}.
            </p>
          )}
        </section>

        <section className="max-w-[900px] mx-auto px-4 pb-10 space-y-4" aria-label="Comment ça marche">
          <h2 className="display text-2xl">Comment ça marche</h2>
          <div className="grid gap-3 min-[640px]:grid-cols-2">
            <Feature
              icon={<CalendarCheck size={20} aria-hidden />}
              title="Vous déclarez vos dates libres"
              body="Une fois, en quelques secondes : les dimanches où l'équipe est disponible, à domicile ou en déplacement, et jusqu'où vous acceptez de vous déplacer."
            />
            <Feature
              icon={<Radar size={20} aria-hidden />}
              title="Le système propose les appariements"
              body="Plus besoin que deux coachs soient devant leur écran au même moment. Les équipes libres le même jour, dans votre catégorie et votre secteur, vous sont présentées."
            />
            <Feature
              icon={<ShieldCheck size={20} aria-hidden />}
              title="Les désistements se voient"
              body="Chaque club porte son historique : matchs honorés, désistements, et ceux tombés à moins de quatre jours. Chaque camp reconfirme sa venue à l'approche du match."
            />
            <Feature
              icon={<MapPinned size={20} aria-hidden />}
              title="Le match se prépare ici"
              body="Horaire, terrain, arbitre, vestiaires, feuille de match et itinéraire au même endroit — et un rappel automatique aux deux clubs la veille."
            />
          </div>
        </section>

        {/* Maillage vers la couche indexable : c'est par ces liens qu'un moteur
            découvre les pages de département, et par eux qu'un visiteur voit
            que le service est déjà vivant près de chez lui. */}
        {busiest.length > 0 && (
          <section className="max-w-[900px] mx-auto px-4 pb-12 space-y-3" aria-label="Départements actifs">
            <h2 className="display text-2xl">Les annonces près de chez vous</h2>
            <ul className="flex flex-wrap gap-2">
              {busiest.map((district) => (
                <li key={district.code}>
                  <Link href={`/f/${district.slug}`} className="chip bg-paper text-ink-soft hover:bg-blue-faint">
                    {district.label} ({district.announcements})
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/f" className="chip bg-blue-soft text-primary">
                  Tous les départements
                </Link>
              </li>
            </ul>
          </section>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="max-w-[900px] mx-auto px-4 py-6 space-y-2 text-xs text-ink-soft">
          <p>
            TeamNexus met en relation les coachs de football amateur pour organiser des matchs amicaux. Les annonces
            sont publiées par les clubs eux-mêmes.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/f" className="underline">
              Annonces par département
            </Link>
            <Link href="/login" className="underline">
              Se connecter
            </Link>
            <Link href="/register" className="underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="card p-5 space-y-2">
      <span className="w-10 h-10 rounded-lg bg-blue-soft text-blue flex items-center justify-center">{icon}</span>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-ink-soft leading-relaxed">{body}</p>
    </article>
  );
}

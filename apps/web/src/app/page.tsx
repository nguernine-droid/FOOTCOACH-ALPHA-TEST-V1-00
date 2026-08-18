import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  MapPinned,
  Radar,
  Route,
  ShieldCheck,
  Siren,
} from "lucide-react";
import { showcaseWorthShowing } from "@teamnexus/shared";
import { fetchDistricts, fetchPublicStats } from "@/lib/publicApi";
import { AppPreview } from "@/components/public/AppPreview";
import { InstallShowcase } from "@/components/public/InstallShowcase";
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
 * Les questions que se pose un coach avant de créer un compte, et leurs
 * réponses — TOUTES vraies. Pas de témoignage inventé, pas de promesse que le
 * produit ne tient pas : le foot amateur est un petit monde, et la première
 * exagération démentie sur un bord de terrain coûte plus cher que dix
 * visiteurs gagnés.
 *
 * La liste sert deux fois : le HTML (accordéons natifs, zéro JavaScript) et le
 * balisage FAQPage, qui rend ces questions éligibles aux résultats enrichis —
 * ce sont exactement les requêtes qu'un coach tape dans un moteur.
 */
const FAQ: { question: string; answer: string }[] = [
  {
    question: "C'est vraiment gratuit ?",
    answer:
      "Oui, entièrement. Pas d'abonnement, pas de version premium, pas de carte bancaire demandée — à l'inscription comme après.",
  },
  {
    question: "Qui peut créer un compte ?",
    answer:
      "Tout coach ou dirigeant d'une équipe de football amateur, de l'école de foot aux vétérans, qu'il ait un club derrière lui ou non. L'inscription demande un surnom, une adresse e-mail et votre équipe — deux minutes, montre en main.",
  },
  {
    question: "Mon adversaire doit-il aussi être inscrit ?",
    answer:
      "Pour convenir du match dans l'application, oui — c'est ce qui permet la confirmation mutuelle, la feuille de match et les rappels automatiques. Les annonces sont en revanche visibles par tout le monde, sans compte : partagez la vôtre, l'adversaire s'inscrira en la voyant.",
  },
  {
    question: "Et si l'adversaire me lâche au dernier moment ?",
    answer:
      "Votre annonce repart automatiquement en SOS : elle passe en tête du radar du secteur et les coachs « jokers » — ceux qui se sont portés volontaires pour dépanner — sont alertés immédiatement. Chaque club porte aussi son historique de désistements, visible avant d'accepter un match.",
  },
  {
    question: "Qu'est-ce que les autres coachs voient de moi ?",
    answer:
      "Votre surnom, votre équipe et votre palier — c'est tout. Ni nom complet, ni téléphone, ni adresse : vos coordonnées ne sont partagées qu'aux coachs que vous ajoutez vous-même en relation.",
  },
];

/**
 * La page d'accueil publique — la vitrine.
 *
 * Elle a UN travail : donner envie de créer un compte et d'installer
 * l'application. Tout ce qui ne sert pas ce travail en a été retiré, et ce qui
 * le sert est ordonné comme un argumentaire : la promesse, la preuve que c'est
 * vivant, comment ça marche, ce qu'on ne trouve nulle part ailleurs,
 * l'installation, les questions qui restent, et une dernière porte.
 *
 * Rendue côté serveur, dans la langue graphique de l'application (mêmes
 * jetons, mêmes fontes, même bandeau structurel) : la vitrine promet
 * exactement ce que l'écran suivant montrera.
 */
export default async function Home() {
  const [districts, stats] = await Promise.all([fetchDistricts(), fetchPublicStats()]);
  const busiest = districts?.slice(0, 6) ?? [];
  /**
   * Les chiffres ne s'affichent qu'à partir d'un certain nombre de coachs.
   * « 3 coachs nous font confiance » fait plus de mal que le silence : le
   * visiteur en conclut que personne ne s'en sert, et il a raison.
   */
  const showStats = showcaseWorthShowing(stats);

  // Nonce de la politique de contenu — sans lui, le balisage FAQ disparaîtrait
  // sans bruit sous `strict-dynamic` (même raison que sur les pages /f).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <HomeRedirect />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      {/* ————— Le bandeau d'ouverture —————
          Le même dégradé structurel que l'en-tête de l'application, en pleine
          largeur : la vitrine EST l'application, dès le premier écran. */}
      <div
        className="text-on-structure"
        style={{
          background:
            "linear-gradient(150deg, var(--structure-1) 0%, var(--structure-2) 60%, var(--structure-3) 130%)",
        }}
      >
        <header>
          <div className="max-w-[1000px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <span className="display text-xl">
              TEAM<span className="text-accent-solid">NEXUS</span>
            </span>
            <nav className="flex items-center gap-1">
              <Link
                href="/login"
                className="text-sm font-bold text-white/75 hover:text-white px-3 py-2 min-h-11 flex items-center transition"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="btn btn-accent inline-flex items-center justify-center gap-2 font-bold rounded-lg
                  px-5 py-2.5 text-sm min-h-11 min-[960px]:min-h-0"
              >
                Créer un compte
              </Link>
            </nav>
          </div>
        </header>

        <section className="max-w-[1000px] mx-auto px-4 pt-10 pb-14 grid gap-12 min-[900px]:grid-cols-[1fr_300px] min-[900px]:items-center">
          <div className="space-y-6 animate-rise-in">
            <p className="section-title text-[12px] text-accent-solid">Football amateur · matchs amicaux</p>
            <h1 className="display text-5xl min-[640px]:text-6xl leading-[0.95]">
              Votre prochain adversaire vous attend déjà.
            </h1>
            <p className="text-base min-[640px]:text-lg text-white/80 max-w-[52ch] leading-relaxed">
              Fini les vingt coups de fil du jeudi soir. Déclarez les dates où votre équipe est libre :
              TeamNexus vous présente les équipes libres en face — bonne catégorie, bon niveau, vraie
              distance jusqu&apos;au terrain. Il ne reste qu&apos;à appuyer sur « Prévenir ».
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="btn btn-accent inline-flex items-center justify-center gap-2 font-bold rounded-lg
                  px-7 py-4 text-[17px] min-h-14"
              >
                Créer un compte coach
              </Link>
              <Link
                href="/f"
                className="inline-flex items-center justify-center gap-2 font-bold rounded-lg px-7 py-4
                  text-[17px] min-h-14 border border-white/25 text-white hover:bg-white/10 transition
                  active:scale-[0.97]"
              >
                Voir les annonces
              </Link>
            </div>
            <p className="text-xs text-white/55">
              Gratuit, sans engagement, sans carte bancaire. La consultation des annonces ne demande même pas de
              compte.
            </p>
          </div>

          {/* L'aperçu vit DANS le bandeau : l'écran clair sur le fond sombre,
              c'est le produit qui sort de la vitrine. */}
          <div className="animate-rise-in">
            <AppPreview />
          </div>
        </section>
      </div>

      <main className="flex-1">
        {/* ————— Les chiffres réels, ou rien du tout —————
            Une page d'accueil qui annonce des milliers d'équipes quand la base
            en compte quarante se retourne contre celui qui l'écrit dès la
            première visite. */}
        {showStats && stats && (
          <section className="max-w-[1000px] mx-auto px-4 -mt-7 relative z-10" aria-label="TeamNexus en chiffres">
            <dl className="grid grid-cols-3 gap-3">
              <Stat
                value={stats.coaches}
                label={`coach${stats.coaches > 1 ? "s" : ""} nous font confiance`}
              />
              <Stat
                value={stats.announcements}
                label={`match${stats.announcements > 1 ? "s" : ""} publié${stats.announcements > 1 ? "s" : ""}`}
              />
              <Stat
                value={stats.matchesPlayed}
                label={`rencontre${stats.matchesPlayed > 1 ? "s" : ""} jouée${stats.matchesPlayed > 1 ? "s" : ""}`}
              />
            </dl>
          </section>
        )}

        {/* ————— Comment ça marche : trois gestes ————— */}
        <section className="max-w-[1000px] mx-auto px-4 py-14 space-y-8" aria-label="Comment ça marche">
          <div className="space-y-2">
            <h2 className="display text-3xl">Trois gestes, un match</h2>
            <p className="text-sm text-ink-soft max-w-[60ch]">
              Le principe qui change tout : vous ne publiez pas une petite annonce en espérant qu&apos;on passe
              devant — c&apos;est le système qui rapproche deux équipes libres le même jour.
            </p>
          </div>
          <ol className="grid gap-4 min-[720px]:grid-cols-3">
            <StepCard
              index={1}
              icon={<CalendarCheck size={20} aria-hidden />}
              title="Déclarez vos dates libres"
              body="Cochez les dimanches sans match dans un calendrier. Domicile, déplacement ou peu importe, et jusqu'à combien de kilomètres. Trente secondes, une fois."
            />
            <StepCard
              index={2}
              icon={<Radar size={20} aria-hidden />}
              title="Recevez les équipes en face"
              body="Dès qu'une équipe compatible est libre le même jour, elle vous est proposée — et une notification vous prévient, sans que vous ayez à rouvrir l'application."
            />
            <StepCard
              index={3}
              icon={<ShieldCheck size={20} aria-hidden />}
              title="Confirmez, jouez"
              body="Un geste pour la prévenir, un fil de discussion pour convenir des détails, et le match est posé : feuille de match, itinéraire et rappels suivent tout seuls."
            />
          </ol>
        </section>

        {/* ————— Ce qu'on ne trouve nulle part ailleurs ————— */}
        <section className="surface-2">
          <div className="max-w-[1000px] mx-auto px-4 py-14 space-y-8" aria-label="Ce qui rend TeamNexus différent">
            <div className="space-y-2">
              <h2 className="display text-3xl">Pensé pour ce qui fait vraiment mal</h2>
              <p className="text-sm text-ink-soft max-w-[60ch]">
                Trouver un adversaire n&apos;est que la moitié du problème. L&apos;autre moitié, c&apos;est le
                désistement du jeudi soir, l&apos;heure qui change, le numéro de vestiaire qu&apos;on redemande —
                et c&apos;est là que TeamNexus travaille le plus.
              </p>
            </div>
            <div className="grid gap-3 min-[640px]:grid-cols-2 min-[900px]:grid-cols-3">
              <Feature
                icon={<Siren size={18} aria-hidden />}
                title="Le SOS qui sauve un dimanche"
                body="Un adversaire se désiste ? Votre annonce repart en tête du radar et les coachs jokers du secteur sont alertés dans la minute."
              />
              <Feature
                icon={<ShieldCheck size={18} aria-hidden />}
                title="La fiabilité, affichée"
                body="Matchs honorés, désistements, et ceux tombés à moins de quatre jours : chaque club porte son historique. Vous savez à qui vous avez affaire avant d'accepter."
              />
              <Feature
                icon={<CalendarClock size={18} aria-hidden />}
                title="La confirmation en deux temps"
                body="À J-7 puis J-3, chaque camp reconfirme sa venue. Un silence en face se voit une semaine avant — plus jamais le samedi soir au téléphone."
              />
              <Feature
                icon={<Route size={18} aria-hidden />}
                title="Le terrain exact, pas la ville"
                body="36 000 stades référencés. Les distances sont calculées jusqu'au terrain, et l'itinéraire s'ouvre dans Plans ou Maps d'une touche."
              />
              <Feature
                icon={<BellRing size={18} aria-hidden />}
                title="Le rappel de la veille"
                body="Heure, stade, arbitre, vestiaires : tout part automatiquement aux deux clubs la veille du match. Le SMS de vérification n'a plus de raison d'être."
              />
              <Feature
                icon={<MapPinned size={18} aria-hidden />}
                title="L'agenda dans votre téléphone"
                body="Vos matchs s'abonnent à l'agenda de l'iPhone ou de Google Agenda. Posé une fois, à jour pour toujours — même pour ceux qui n'ouvrent jamais d'application."
              />
            </div>
          </div>
        </section>

        {/* ————— L'installation ————— */}
        <section className="max-w-[1000px] mx-auto px-4 py-14" aria-label="Installer l'application">
          <div className="card-spotlight p-6 min-[720px]:p-10 grid gap-8 min-[720px]:grid-cols-[1fr_auto] min-[720px]:items-center">
            <div className="space-y-4">
              <h2 className="display text-3xl">Installez-la comme une vraie application</h2>
              <p className="text-sm max-w-[55ch] leading-relaxed" style={{ color: "var(--spotlight-muted)" }}>
                TeamNexus s&apos;installe sur l&apos;écran d&apos;accueil directement depuis le navigateur — sans
                passer par un magasin d&apos;applications. Plein écran, alertes de match même fermée, et l&apos;icône
                à côté de WhatsApp, là où se décident les matchs.
              </p>
              <InstallShowcase />
            </div>
            <div className="hidden min-[720px]:block">
              <AppPreview />
            </div>
          </div>
        </section>

        {/* ————— Les questions qui restent —————
            En accordéons natifs : zéro JavaScript, et le contenu reste dans le
            HTML — ce qui compte autant pour un moteur que pour un lecteur. */}
        <section className="max-w-[720px] mx-auto px-4 pb-14 space-y-6" aria-label="Questions fréquentes">
          <h2 className="display text-3xl">Les questions qu&apos;on nous pose</h2>
          <div className="space-y-2">
            {FAQ.map((item) => (
              <details key={item.question} className="card px-5 py-1 group">
                <summary className="cursor-pointer list-none py-3.5 min-h-11 flex items-center justify-between gap-3 text-sm font-bold select-none">
                  {item.question}
                  <span
                    aria-hidden
                    className="text-ink-faint shrink-0 transition group-open:rotate-45 text-lg leading-none"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-4 text-sm text-ink-soft leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ————— Maillage vers la couche indexable ————— */}
        {busiest.length > 0 && (
          <section className="max-w-[1000px] mx-auto px-4 pb-14 space-y-3" aria-label="Départements actifs">
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

        {/* ————— La dernière porte —————
            Même bandeau qu'à l'ouverture : la page se referme comme elle
            s'est ouverte, sur l'invitation. */}
        <section
          className="text-on-structure"
          style={{
            background:
              "linear-gradient(150deg, var(--structure-1) 0%, var(--structure-2) 60%, var(--structure-3) 130%)",
          }}
          aria-label="Créer un compte"
        >
          <div className="max-w-[1000px] mx-auto px-4 py-14 text-center space-y-5">
            <h2 className="display text-4xl leading-tight">Le prochain dimanche libre n&apos;attendra pas.</h2>
            <p className="text-sm text-white/70 max-w-[45ch] mx-auto">
              Deux minutes pour créer le compte, trente secondes pour déclarer vos dates. Le reste, c&apos;est
              TeamNexus qui s&apos;en charge.
            </p>
            <Link
              href="/register"
              className="btn btn-accent inline-flex items-center justify-center gap-2 font-bold rounded-lg
                px-8 py-4 text-[17px] min-h-14"
            >
              Créer un compte coach
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-[1000px] mx-auto px-4 py-6 space-y-2 text-xs text-ink-soft">
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

/** Un chiffre en gros, ce qu'il compte en dessous */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="card p-4 text-center">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="display text-3xl min-[640px]:text-4xl tabular-nums text-primary block leading-none">
          {value.toLocaleString("fr-FR")}
        </span>
        <span className="block text-[11px] font-semibold text-ink-soft mt-1.5 leading-tight">{label}</span>
      </dd>
    </div>
  );
}

/** Une étape numérotée du parcours */
function StepCard({
  index,
  icon,
  title,
  body,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="card p-5 space-y-3 list-none">
      <div className="flex items-center justify-between">
        <span className="w-11 h-11 rounded-lg bg-blue-soft text-blue flex items-center justify-center">{icon}</span>
        <span className="display text-4xl text-ink-faint leading-none opacity-40" aria-hidden>
          {index}
        </span>
      </div>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-ink-soft leading-relaxed">{body}</p>
    </li>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="card p-5 space-y-2">
      <span className="w-10 h-10 rounded-lg bg-accent-surface text-accent flex items-center justify-center">
        {icon}
      </span>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-ink-soft leading-relaxed">{body}</p>
    </article>
  );
}

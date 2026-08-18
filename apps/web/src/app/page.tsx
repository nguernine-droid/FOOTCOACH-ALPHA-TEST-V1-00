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
import { BeforeAfter } from "@/components/public/BeforeAfter";
import { CountUp } from "@/components/public/CountUp";
import { HeroMockup } from "@/components/public/HeroMockup";
import { InstallShowcase } from "@/components/public/InstallShowcase";
import { MatchingDetail } from "@/components/public/MatchingDetail";
import { Reveal } from "@/components/public/Reveal";
import { VitrineShell } from "@/components/public/VitrineShell";
import {
  IconTile,
  Section,
  SectionHeading,
  Shell,
  VButtonLink,
  VCard,
} from "@/components/public/primitives";
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
 * vivant, comment ça marche, ce que ça remplace, comment le rapprochement
 * opère, ce qu'on ne trouve nulle part ailleurs, l'installation, les questions
 * qui restent, et une dernière porte.
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
    <VitrineShell>
      <HomeRedirect />
      {/* `suppressHydrationWarning` pour la même raison que le script de thème
          de `layout.tsx` : après avoir lu la page, le navigateur VIDE
          l'attribut `nonce` (une défense contre son exfiltration par un
          sélecteur CSS). Le client lit donc une chaîne vide là où le serveur a
          écrit le jeton, et React y voit une divergence. Il n'y a rien à
          réparer — le nonce reste dans la propriété DOM. */}
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      {/* ————— La promesse ————— */}
      <Shell className="pt-12 pb-20 md:pt-20 md:pb-32">
        <div className="grid gap-16 md:gap-12 min-[900px]:grid-cols-[1fr_340px] min-[900px]:items-center">
          <div className="space-y-7">
            <Reveal>
              <p className="section-title text-[12px] text-accent">Football amateur · matchs amicaux</p>
            </Reveal>
            <Reveal delay={80}>
              {/* Un SEUL mot en couleur dans tout le haut de page : celui qui
                  dit ce que le visiteur est venu chercher. */}
              <h1 className="display text-5xl min-[640px]:text-6xl md:text-7xl leading-[0.95] text-primary">
                Votre prochain <span className="v-word">adversaire</span> vous attend déjà.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-base md:text-lg text-secondary max-w-[58ch] leading-relaxed">
                Fini les vingt coups de fil du jeudi soir. Déclarez les dates où votre équipe est libre :
                TeamNexus vous présente les équipes libres en face — bonne catégorie, bon niveau, vraie distance
                jusqu&apos;au terrain. Il ne reste qu&apos;à appuyer sur « Prévenir ».
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="flex flex-wrap gap-3">
                <VButtonLink href="/register" size="lg">
                  Créer un compte coach
                </VButtonLink>
                <VButtonLink href="/f" variant="ghost" size="lg">
                  Voir les annonces
                </VButtonLink>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <p className="text-xs text-muted">
                Gratuit, sans engagement, sans carte bancaire. La consultation des annonces ne demande même pas
                de compte.
              </p>
            </Reveal>
          </div>

          <Reveal delay={160}>
            <HeroMockup />
          </Reveal>
        </div>
      </Shell>

      {/* ————— Les chiffres réels, ou rien du tout —————
          Une page d'accueil qui annonce des milliers d'équipes quand la base en
          compte quarante se retourne contre celui qui l'écrit dès la première
          visite. En dessous du seuil, la section n'existe pas. */}
      {showStats && stats && (
        <Shell className="pb-20 md:pb-28">
          <Reveal>
            <dl className="grid grid-cols-3 gap-3 md:gap-5">
              <Stat value={stats.coaches} label={`coach${stats.coaches > 1 ? "s" : ""} nous font confiance`} />
              <Stat
                value={stats.announcements}
                label={`match${stats.announcements > 1 ? "s" : ""} publié${stats.announcements > 1 ? "s" : ""}`}
              />
              <Stat
                value={stats.matchesPlayed}
                label={`rencontre${stats.matchesPlayed > 1 ? "s" : ""} jouée${stats.matchesPlayed > 1 ? "s" : ""}`}
              />
            </dl>
          </Reveal>
        </Shell>
      )}

      {/* ————— Comment ça marche : trois gestes ————— */}
      <div className="v-surface-1 border-y border-[var(--v-rim-soft)]">
        <Section label="Comment ça marche">
          <Reveal>
            <SectionHeading
              eyebrow="Trois gestes"
              title={
                <>
                  Trois gestes, <span className="v-word">un match</span>.
                </>
              }
              lead="Le principe qui change tout : vous ne publiez pas une petite annonce en espérant qu'on passe devant — c'est le système qui rapproche deux équipes libres le même jour."
            />
          </Reveal>
          <ol className="grid gap-5 md:grid-cols-3 mt-12">
            <StepCard
              index={1}
              delay={0}
              icon={<CalendarCheck size={20} aria-hidden />}
              title="Déclarez vos dates libres"
              body="Cochez les dimanches sans match dans un calendrier. Domicile, déplacement ou peu importe, et jusqu'à combien de kilomètres. Trente secondes, une fois."
            />
            <StepCard
              index={2}
              delay={80}
              icon={<Radar size={20} aria-hidden />}
              title="Recevez les équipes en face"
              body="Dès qu'une équipe compatible est libre le même jour, elle vous est proposée — et une notification vous prévient, sans que vous ayez à rouvrir l'application."
            />
            <StepCard
              index={3}
              delay={160}
              icon={<ShieldCheck size={20} aria-hidden />}
              title="Confirmez, jouez"
              body="Un geste pour la prévenir, un fil de discussion pour convenir des détails, et le match est posé : feuille de match, itinéraire et rappels suivent tout seuls."
            />
          </ol>
        </Section>
      </div>

      {/* ————— Ce que ça remplace ————— */}
      <Section label="Avant et après TeamNexus">
        <BeforeAfter />
      </Section>

      {/* ————— Comment le rapprochement opère ————— */}
      <div className="v-surface-1 border-y border-[var(--v-rim-soft)]">
        <Section label="Le rapprochement en détail">
          <MatchingDetail />
        </Section>
      </div>

      {/* ————— Ce qu'on ne trouve nulle part ailleurs ————— */}
      <Section label="Ce qui rend TeamNexus différent">
        <Reveal>
          <SectionHeading
            eyebrow="Le détail qui compte"
            title="Pensé pour ce qui fait vraiment mal"
            lead="Trouver un adversaire n'est que la moitié du problème. L'autre moitié, c'est le désistement du jeudi soir, l'heure qui change, le numéro de vestiaire qu'on redemande — et c'est là que TeamNexus travaille le plus."
          />
        </Reveal>
        <div className="grid gap-5 min-[640px]:grid-cols-2 min-[900px]:grid-cols-3 mt-12">
          <Feature
            delay={0}
            icon={<Siren size={20} aria-hidden />}
            title="Le SOS qui sauve un dimanche"
            body="Un adversaire se désiste ? Votre annonce repart en tête du radar et les coachs jokers du secteur sont alertés dans la minute."
          />
          <Feature
            delay={60}
            icon={<ShieldCheck size={20} aria-hidden />}
            title="La fiabilité, affichée"
            body="Matchs honorés, désistements, et ceux tombés à moins de quatre jours : chaque club porte son historique. Vous savez à qui vous avez affaire avant d'accepter."
          />
          <Feature
            delay={120}
            icon={<CalendarClock size={20} aria-hidden />}
            title="La confirmation en deux temps"
            body="À J-7 puis J-3, chaque camp reconfirme sa venue. Un silence en face se voit une semaine avant — plus jamais le samedi soir au téléphone."
          />
          <Feature
            delay={0}
            icon={<Route size={20} aria-hidden />}
            title="Le terrain exact, pas la ville"
            body="36 000 stades référencés. Les distances sont calculées jusqu'au terrain, et l'itinéraire s'ouvre dans Plans ou Maps d'une touche."
          />
          <Feature
            delay={60}
            icon={<BellRing size={20} aria-hidden />}
            title="Le rappel de la veille"
            body="Heure, stade, arbitre, vestiaires : tout part automatiquement aux deux clubs la veille du match. Le SMS de vérification n'a plus de raison d'être."
          />
          <Feature
            delay={120}
            icon={<MapPinned size={20} aria-hidden />}
            title="L'agenda dans votre téléphone"
            body="Vos matchs s'abonnent à l'agenda de l'iPhone ou de Google Agenda. Posé une fois, à jour pour toujours — même pour ceux qui n'ouvrent jamais d'application."
          />
        </div>
      </Section>

      {/* ————— L'installation ————— */}
      <div className="v-surface-1 border-y border-[var(--v-rim-soft)]">
        <Section label="Installer l'application">
          <Reveal>
            <VCard className="relative p-7 md:p-12 overflow-hidden grid gap-10 min-[820px]:grid-cols-[1fr_auto] min-[820px]:items-center">
              <div className="v-halo v-halo-soft -top-24 -left-24 w-80 h-80" />
              <div className="relative space-y-5">
                <SectionHeading
                  eyebrow="Sur l'écran d'accueil"
                  title="Installez-la comme une vraie application"
                  lead="TeamNexus s'installe sur l'écran d'accueil directement depuis le navigateur — sans passer par un magasin d'applications. Plein écran, alertes de match même fermée, et l'icône à côté de WhatsApp, là où se décident les matchs."
                />
                <InstallShowcase />
              </div>
              <div className="relative hidden min-[820px]:block">
                <AppPreview />
              </div>
            </VCard>
          </Reveal>
        </Section>
      </div>

      {/* ————— Les questions qui restent —————
          En accordéons NATIFS : zéro JavaScript, le contenu reste dans le HTML
          — ce qui compte autant pour un moteur que pour un lecteur d'écran, à
          qui `<details>` annonce déjà l'état ouvert ou fermé sans qu'on ait à
          le déclarer à la main. */}
      <Section label="Questions fréquentes">
        <div className="max-w-[760px] mx-auto">
          <Reveal>
            <SectionHeading eyebrow="FAQ" title="Les questions qu'on nous pose" align="center" />
          </Reveal>
          <div className="space-y-3 mt-12">
            {FAQ.map((item, i) => (
              <Reveal key={item.question} delay={i * 60}>
                <details className="v-card group px-5 md:px-6">
                  <summary className="cursor-pointer list-none py-4 min-h-11 flex items-center justify-between gap-4 text-sm md:text-base font-bold text-primary select-none">
                    {item.question}
                    <span
                      aria-hidden
                      className="text-muted shrink-0 transition group-open:rotate-45 text-xl leading-none"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-sm text-secondary leading-relaxed max-w-[65ch]">{item.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ————— Maillage vers la couche indexable —————
          Ces liens nourrissent les pages /f/* : les retirer coûterait à la fois
          l'entrée par la recherche locale et la preuve, ici, que le service est
          vivant près de chez le visiteur. */}
      {busiest.length > 0 && (
        <Shell className="pb-24 md:pb-36">
          <Reveal>
            <h2 className="display text-2xl md:text-3xl text-primary">Les annonces près de chez vous</h2>
            <ul className="flex flex-wrap gap-2.5 mt-6">
              {busiest.map((district) => (
                <li key={district.code}>
                  <Link href={`/f/${district.slug}`} className="v-chip v-lift inline-flex min-h-11 px-4">
                    {district.label} ({district.announcements})
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/f" className="v-chip v-chip-accent v-lift inline-flex min-h-11 px-4">
                  Tous les départements
                </Link>
              </li>
            </ul>
          </Reveal>
        </Shell>
      )}

      {/* ————— La dernière porte ————— */}
      <div className="relative overflow-hidden border-t border-[var(--v-rim-soft)] v-surface-1">
        {/* Le second et dernier halo orange de la page. */}
        <div className="v-halo left-1/2 -translate-x-1/2 -top-32 w-[36rem] h-[36rem]" />
        <Section label="Créer un compte">
          <Reveal>
            <div className="relative text-center space-y-7">
              <h2 className="display text-4xl md:text-6xl leading-[0.95] text-primary">
                Le prochain dimanche libre <span className="v-word">n&apos;attendra pas</span>.
              </h2>
              <p className="text-base md:text-lg text-secondary max-w-[48ch] mx-auto leading-relaxed">
                Deux minutes pour créer le compte, trente secondes pour déclarer vos dates. Le reste, c&apos;est
                TeamNexus qui s&apos;en charge.
              </p>
              <div className="flex justify-center pt-1">
                <VButtonLink href="/register" size="lg">
                  Créer un compte coach
                </VButtonLink>
              </div>
            </div>
          </Reveal>
        </Section>
      </div>
    </VitrineShell>
  );
}

/**
 * Un chiffre en gros, ce qu'il compte en dessous.
 *
 * Le nombre visible est animé, donc masqué aux technologies d'assistance : une
 * synthèse vocale annoncerait sinon les trente valeurs intermédiaires. La
 * valeur finale leur est fournie à part, une fois.
 */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <VCard className="p-5 md:p-7 text-center">
      <dt className="sr-only">{label}</dt>
      <dd>
        <CountUp
          value={value}
          className="display text-4xl md:text-5xl tabular-nums text-primary block leading-none"
        />
        <span className="sr-only">{value.toLocaleString("fr-FR")}</span>
        <span aria-hidden className="block text-[11px] md:text-xs font-semibold text-muted mt-2.5 leading-tight">
          {label}
        </span>
      </dd>
    </VCard>
  );
}

/** Une étape numérotée du parcours. Le chiffre est en filigrane DERRIÈRE le
 *  contenu : il ordonne la lecture sans disputer la place au titre. */
function StepCard({
  index,
  icon,
  title,
  body,
  delay,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  body: string;
  delay: number;
}) {
  return (
    <Reveal as="li" delay={delay} className="h-full list-none">
      <VCard lift className="relative p-7 h-full overflow-hidden">
        <span
          aria-hidden
          className="display absolute -right-2 -top-6 text-[8rem] leading-none text-primary opacity-[0.04] select-none"
        >
          {index}
        </span>
        <div className="relative space-y-4">
          <IconTile accent>{icon}</IconTile>
          <h3 className="display text-lg text-primary">{title}</h3>
          <p className="text-sm text-secondary leading-relaxed">{body}</p>
        </div>
      </VCard>
    </Reveal>
  );
}

function Feature({
  icon,
  title,
  body,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <VCard as="article" lift className="p-7 h-full space-y-4">
        <IconTile>{icon}</IconTile>
        <h3 className="display text-lg text-primary">{title}</h3>
        <p className="text-sm text-secondary leading-relaxed">{body}</p>
      </VCard>
    </Reveal>
  );
}

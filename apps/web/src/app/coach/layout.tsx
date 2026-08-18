"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Megaphone, MessageCircle } from "lucide-react";
import { getStoredUser } from "@/lib/api";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";
import { TabPager, type Pane } from "@/components/TabPager";
import { QuickActionProvider, type QuickAction, type QuickChoice } from "@/components/QuickActionContext";
// Les écrans d'onglet sont montés ensemble par le carrousel du téléphone :
// il faut donc les composants eux-mêmes, et pas seulement leurs routes.
import CoachDashboard from "./page";
import AnnouncementsPage from "./announcements/page";
import CoachMatchesPage from "./matches/page";
import CoachMessagesPage from "./messages/page";

// V1 recentrée sur la gestion des matchs amicaux entre coachs.
// Le radar vit désormais dans le tableau de bord ; les sections secondaires
// (agenda, relations, mes équipes, profil) sont rassemblées dans la feuille
// « Moi », qui s'ouvre par la photo du header ; le covoiturage est masqué.
// La barre basse ne porte donc que des destinations, dont les messages : les
// conversations naissent des matchs convenus, elles ont leur place à côté d'eux.
// `badge: "activity"` : le tableau de bord porte le fil d'activité, c'est donc
// lui qui signale qu'il s'est passé quelque chose depuis la dernière visite.
const TABS: AppTab[] = [
  { href: "/coach", label: "Tableau de bord", shortLabel: "Board", icon: LayoutDashboard, exact: true, badge: "activity" },
  { href: "/coach/announcements", label: "Annonces", icon: Megaphone },
  { href: "/coach/matches", label: "Matchs", icon: CalendarDays },
  { href: "/coach/messages", label: "Messages", icon: MessageCircle, badge: "messages" },
];

/**
 * Les mêmes écrans, dans le même ordre, pour le carrousel du téléphone. Les
 * éléments sont créés une fois pour toutes : recréés à chaque rendu de la mise
 * en page, ils resteraient équivalents pour React, mais autant ne pas lui
 * donner l'occasion d'y regarder à deux fois pendant un glissé.
 */
const PANES: Pane[] = [
  { href: "/coach", node: <CoachDashboard /> },
  { href: "/coach/announcements", node: <AnnouncementsPage /> },
  { href: "/coach/matches", node: <CoachMatchesPage /> },
  { href: "/coach/messages", node: <CoachMessagesPage /> },
];

/**
 * Le « + » ne crée plus directement une annonce : il demande laquelle des
 * créations le coach a en tête. Un tournoi ne se trouvait qu'en descendant
 * jusqu'à sa section du radar, alors que c'est la même intention — organiser
 * quelque chose et le faire savoir.
 *
 * L'annonce reste en premier : c'est le geste courant, le tournoi est
 * l'exception.
 */
const CREATE_OPTIONS: QuickChoice[] = [
  {
    href: "/coach/announcements/new",
    label: "Match amical",
    description: "Votre date, votre stade — les coachs du secteur la voient sur leur radar.",
    icon: "announcement",
  },
  {
    href: "/coach/availabilities",
    label: "Dates libres",
    description: "Dites quand vous êtes libres — les équipes libres en face vous sont proposées.",
    icon: "availability",
  },
  {
    href: "/coach/tournaments/new",
    label: "Tournoi",
    description: "Annoncez le vôtre et ouvrez les inscriptions aux équipes du secteur.",
    icon: "tournament",
  },
];

/**
 * La publication d'un billet, réservée aux contributeurs. En dernier : c'est la
 * création la plus rare, et la seule que tout le monde ne peut pas faire.
 *
 * Elle a rejoint le « + » quand la zone de rédaction a quitté le haut du
 * panneau d'affichage — elle y occupait l'écran à demeure pour un geste
 * saisonnier.
 */
const PUBLISH_OPTION: QuickChoice = {
  href: "/coach/publications/new",
  label: "Information",
  description: "Poules, intempéries, plateau annulé — au panneau d'affichage du secteur.",
  icon: "publication",
};

/**
 * Signaler un bug ou proposer une amélioration — raccourci vers l'écran déjà
 * accessible depuis Réglages. Toujours en dernier : ce n'est pas une création.
 *
 * Réservée aux contributeurs, comme la publication : faire remonter ce qui ne va
 * pas fait partie de ce que la casquette engage, et le retour ouvre une
 * discussion avec l'équipe — un canal qui se suit, pas une boîte à idées.
 */
const FEEDBACK_OPTION: QuickChoice = {
  href: "/coach/feedback/new",
  label: "Bug ou amélioration",
  description: "Un souci, une idée — ça ouvre une discussion avec l'équipe.",
  icon: "feedback",
};

/** Ce que crée le bouton central selon la page ouverte */
function defaultAction(pathname: string, contributor: boolean): QuickAction | null {
  if (pathname.startsWith("/coach/agenda")) {
    return { kind: "link", href: "/coach/agenda?nouveau=1", label: "Créer un événement" };
  }
  // Sur « Mes équipes », le « + » crée une équipe : y publier une annonce
  // n'avait rien à voir avec ce que le coach a sous les yeux.
  if (pathname.startsWith("/coach/team")) {
    return { kind: "link", href: "/coach/team/new", label: "Créer une équipe" };
  }
  return {
    kind: "choice",
    label: "Créer",
    options: contributor ? [...CREATE_OPTIONS, PUBLISH_OPTION, FEEDBACK_OPTION] : [...CREATE_OPTIONS],
  };
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Une page de création remplace le « + » par un « ✓ » qui valide son formulaire
  const [override, setOverride] = useState<QuickAction | null>(null);
  /**
   * La casquette est lue APRÈS le montage : elle vit dans le stockage local,
   * absent du rendu serveur, et une liste d'options différente de part et
   * d'autre ferait diverger l'hydratation. Relue à chaque navigation, elle suit
   * un coach qui vient de se déclarer contributeur dans son profil.
   */
  const [contributor, setContributor] = useState(false);
  useEffect(() => {
    setContributor((getStoredUser()?.categories ?? []).includes("contributeur"));
  }, [pathname]);
  const action = override ?? defaultAction(pathname, contributor);

  return (
    <QuickActionProvider value={setOverride}>
      <RoleGuard
        role="coach"
        nav={<AppTabs tabs={TABS} action={action} ariaLabel="Sections de l'espace coach" />}
      >
        {/* Au téléphone, les onglets sont montés côte à côte et suivent le
            doigt : on voit les deux écrans pendant le glissé. Ailleurs — sur une
            sous-page, ou au-delà de 960 px — c'est la route courante, comme
            partout. */}
        <TabPager panes={PANES} fallback={children} />
      </RoleGuard>
    </QuickActionProvider>
  );
}

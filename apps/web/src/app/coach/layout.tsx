"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Megaphone } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";
import { TabPager, type Pane } from "@/components/TabPager";
import { QuickActionProvider, type QuickAction } from "@/components/QuickActionContext";
// Les trois écrans d'onglet sont montés ensemble par le carrousel du téléphone :
// il faut donc les composants eux-mêmes, et pas seulement leurs routes.
import CoachDashboard from "./page";
import AnnouncementsPage from "./announcements/page";
import CoachMatchesPage from "./matches/page";

// V1 recentrée sur la gestion des matchs amicaux entre coachs.
// Le radar vit désormais dans le tableau de bord ; les sections secondaires
// (agenda, relations, mes équipes, profil) sont rassemblées dans la feuille
// « Moi » de la barre basse ; le covoiturage est masqué.
// `badge: "activity"` : le tableau de bord porte le fil d'activité, c'est donc
// lui qui signale qu'il s'est passé quelque chose depuis la dernière visite.
const TABS: AppTab[] = [
  { href: "/coach", label: "Tableau de bord", shortLabel: "Board", icon: LayoutDashboard, exact: true, badge: "activity" },
  { href: "/coach/announcements", label: "Annonces", icon: Megaphone },
  { href: "/coach/matches", label: "Matchs", icon: CalendarDays },
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
];

/**
 * Le « + » ne crée plus directement une annonce : il demande laquelle des deux
 * créations le coach a en tête. Un tournoi ne se trouvait qu'en descendant
 * jusqu'à sa section du radar, alors que c'est la même intention — organiser
 * quelque chose et le faire savoir.
 *
 * L'annonce reste en premier : c'est le geste courant, le tournoi est
 * l'exception.
 */
const CREATE: QuickAction = {
  kind: "choice",
  label: "Créer",
  options: [
    {
      href: "/coach/announcements/new",
      label: "Match amical",
      description: "Votre date, votre stade — les coachs du secteur la voient sur leur radar.",
      icon: "announcement",
    },
    {
      href: "/coach/tournaments/new",
      label: "Tournoi",
      description: "Annoncez le vôtre et ouvrez les inscriptions aux équipes du secteur.",
      icon: "tournament",
    },
  ],
};

/** Ce que crée le bouton central selon la page ouverte */
function defaultAction(pathname: string): QuickAction | null {
  if (pathname.startsWith("/coach/agenda")) {
    return { kind: "link", href: "/coach/agenda?nouveau=1", label: "Créer un événement" };
  }
  // Sur « Mes équipes », le « + » crée une équipe : y publier une annonce
  // n'avait rien à voir avec ce que le coach a sous les yeux.
  if (pathname.startsWith("/coach/team")) {
    return { kind: "link", href: "/coach/team/new", label: "Créer une équipe" };
  }
  return CREATE;
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Une page de création remplace le « + » par un « ✓ » qui valide son formulaire
  const [override, setOverride] = useState<QuickAction | null>(null);
  const action = override ?? defaultAction(pathname);

  return (
    <QuickActionProvider value={setOverride}>
      <RoleGuard
        role="coach"
        nav={<AppTabs tabs={TABS} action={action} ariaLabel="Sections de l'espace coach" />}
      >
        {/* Au téléphone, les trois onglets sont montés côte à côte et suivent le
            doigt : on voit les deux écrans pendant le glissé. Ailleurs — sur une
            sous-page, ou au-delà de 960 px — c'est la route courante, comme
            partout. */}
        <TabPager panes={PANES} fallback={children} />
      </RoleGuard>
    </QuickActionProvider>
  );
}

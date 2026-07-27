"use client";

import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Megaphone, Users } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab, type QuickAction } from "@/components/AppTabs";

// V1 recentrée sur la gestion des matchs amicaux entre coachs.
// Le radar vit désormais dans le tableau de bord ; l'agenda est accessible
// par l'icône du header ; le covoiturage est masqué.
const TABS: AppTab[] = [
  { href: "/coach", label: "Tableau de bord", shortLabel: "Board", icon: LayoutDashboard, exact: true },
  { href: "/coach/announcements", label: "Annonces", icon: Megaphone },
  { href: "/coach/matches", label: "Matchs", icon: CalendarDays },
  { href: "/coach/team", label: "Mes équipes", shortLabel: "Équipes", icon: Users },
];

const PUBLISH: QuickAction = { href: "/coach/announcements/new", label: "Publier une annonce" };

/** Ce que crée le bouton « + » selon la page ouverte */
function quickAction(pathname: string): QuickAction | null {
  if (pathname.startsWith("/coach/agenda")) return { href: "/coach/agenda?nouveau=1", label: "Créer un événement" };
  // Sur le formulaire de publication, le « + » n'aurait rien à créer de plus
  if (pathname.startsWith("/coach/announcements/new")) return null;
  return PUBLISH;
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <RoleGuard role="coach" nav={<AppTabs tabs={TABS} action={quickAction(pathname)} ariaLabel="Sections de l'espace coach" />}>
      {children}
    </RoleGuard>
  );
}

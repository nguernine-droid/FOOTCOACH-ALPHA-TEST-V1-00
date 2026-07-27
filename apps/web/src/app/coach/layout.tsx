"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, Megaphone, Users } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";
import { QuickActionProvider, type QuickAction } from "@/components/QuickActionContext";

// V1 recentrée sur la gestion des matchs amicaux entre coachs.
// Le radar vit désormais dans le tableau de bord ; l'agenda est accessible
// par l'icône du header ; le covoiturage est masqué.
const TABS: AppTab[] = [
  { href: "/coach", label: "Tableau de bord", shortLabel: "Board", icon: LayoutDashboard, exact: true },
  { href: "/coach/announcements", label: "Annonces", icon: Megaphone },
  { href: "/coach/matches", label: "Matchs", icon: CalendarDays },
  { href: "/coach/team", label: "Mes équipes", shortLabel: "Équipes", icon: Users },
];

const PUBLISH: QuickAction = { kind: "link", href: "/coach/announcements/new", label: "Publier une annonce" };

/** Ce que crée le bouton central selon la page ouverte */
function defaultAction(pathname: string): QuickAction | null {
  if (pathname.startsWith("/coach/agenda")) {
    return { kind: "link", href: "/coach/agenda?nouveau=1", label: "Créer un événement" };
  }
  return PUBLISH;
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Une page de création remplace le « + » par un « ✓ » qui valide son formulaire
  const [override, setOverride] = useState<QuickAction | null>(null);
  const action = override ?? defaultAction(pathname);

  return (
    <QuickActionProvider value={setOverride}>
      <RoleGuard role="coach" nav={<AppTabs tabs={TABS} action={action} ariaLabel="Sections de l'espace coach" />}>
        {children}
      </RoleGuard>
    </QuickActionProvider>
  );
}

"use client";

import { CalendarDays, CalendarRange, Car, LayoutDashboard, Radar, Users } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";

const TABS: AppTab[] = [
  { href: "/coach", label: "Tableau de bord", shortLabel: "Board", icon: LayoutDashboard, exact: true },
  { href: "/coach/matches", label: "Matchs", icon: CalendarDays },
  { href: "/coach/agenda", label: "Agenda", icon: CalendarRange },
  { href: "/coach/team", label: "Mon équipe", shortLabel: "Équipe", icon: Users },
  { href: "/coach/carpool", label: "Covoiturage", shortLabel: "Covoit", icon: Car },
  { href: "/coach/radar", label: "Radar", icon: Radar },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="coach" nav={<AppTabs tabs={TABS} ariaLabel="Sections de l'espace coach" />}>
      {children}
    </RoleGuard>
  );
}

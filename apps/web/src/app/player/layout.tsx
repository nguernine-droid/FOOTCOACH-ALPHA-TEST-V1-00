"use client";

import { CalendarDays, CalendarRange, CircleUserRound, Home } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";

const TABS: AppTab[] = [
  { href: "/player", label: "Accueil", icon: Home, exact: true },
  { href: "/player/matches", label: "Matchs", icon: CalendarDays },
  { href: "/player/agenda", label: "Agenda", icon: CalendarRange },
  { href: "/player/profile", label: "Profil", icon: CircleUserRound },
];

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="player" nav={<AppTabs tabs={TABS} ariaLabel="Sections de l'espace joueur" />}>
      {children}
    </RoleGuard>
  );
}

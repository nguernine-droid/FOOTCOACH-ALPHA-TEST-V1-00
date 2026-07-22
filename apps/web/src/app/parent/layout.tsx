"use client";

import { CalendarRange, CircleUserRound, Home } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";

const TABS: AppTab[] = [
  { href: "/parent", label: "Accueil", icon: Home, exact: true },
  { href: "/parent/agenda", label: "Agenda", icon: CalendarRange },
  { href: "/parent/profile", label: "Profil", icon: CircleUserRound },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="parent" nav={<AppTabs tabs={TABS} ariaLabel="Sections de l'espace parent" />}>
      {children}
    </RoleGuard>
  );
}

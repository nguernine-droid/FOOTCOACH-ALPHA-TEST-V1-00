"use client";

import { LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";

const TABS: AppTab[] = [
  { href: "/club", label: "Tableau de bord", shortLabel: "Board", icon: LayoutDashboard, exact: true },
  { href: "/club/equipes", label: "Équipes", icon: Users },
  { href: "/club/coachs", label: "Coachs", icon: ShieldCheck },
];

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="club" nav={<AppTabs tabs={TABS} ariaLabel="Sections de l'espace club" />}>
      {children}
    </RoleGuard>
  );
}

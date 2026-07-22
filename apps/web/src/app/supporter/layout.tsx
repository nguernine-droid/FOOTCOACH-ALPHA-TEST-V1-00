"use client";

import { CircleUserRound, Home } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";

const TABS: AppTab[] = [
  { href: "/supporter", label: "Accueil", icon: Home, exact: true },
  { href: "/supporter/profile", label: "Profil", icon: CircleUserRound },
];

export default function SupporterLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="supporter" nav={<AppTabs tabs={TABS} ariaLabel="Sections de l'espace supporter" />}>
      {children}
    </RoleGuard>
  );
}

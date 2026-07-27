"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";
import type { QuickAction } from "@/components/QuickActionContext";

const TABS: AppTab[] = [
  { href: "/club", label: "Tableau de bord", shortLabel: "Board", icon: LayoutDashboard, exact: true },
  { href: "/club/equipes", label: "Équipes", icon: Users },
  { href: "/club/coachs", label: "Coachs", icon: ShieldCheck },
];

/** Ce que crée le bouton central selon la page ouverte */
function actionFor(pathname: string): QuickAction | null {
  if (pathname.startsWith("/club/equipes")) {
    return { kind: "link", href: "/club/equipes?nouveau=1", label: "Créer une équipe" };
  }
  if (pathname.startsWith("/club/coachs")) {
    return { kind: "link", href: "/club/coachs?nouveau=1", label: "Créer un coach" };
  }
  return null;
}

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <RoleGuard
      role="club"
      nav={<AppTabs tabs={TABS} action={actionFor(pathname)} ariaLabel="Sections de l'espace club" />}
    >
      {children}
    </RoleGuard>
  );
}

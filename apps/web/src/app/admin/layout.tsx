"use client";

import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, MapPinned, MessageSquareWarning, Users } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";
import type { QuickAction } from "@/components/QuickActionContext";

const TABS: AppTab[] = [
  { href: "/admin", label: "Tableau de bord", shortLabel: "Board", icon: LayoutDashboard, exact: true },
  { href: "/admin/comptes", label: "Comptes", icon: Users },
  { href: "/admin/clubs", label: "Clubs", icon: Building2 },
  { href: "/admin/districts", label: "Liquidité", shortLabel: "Liquidité", icon: MapPinned },
  { href: "/admin/signalements", label: "Signalements", icon: MessageSquareWarning },
];

/** Ce que crée le bouton central selon la page ouverte */
function actionFor(pathname: string): QuickAction | null {
  if (pathname.startsWith("/admin/comptes")) {
    return { kind: "link", href: "/admin/comptes?nouveau=1", label: "Créer un club" };
  }
  return null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <RoleGuard
      role="admin"
      nav={<AppTabs tabs={TABS} action={actionFor(pathname)} ariaLabel="Sections de l'espace administrateur" />}
    >
      {children}
    </RoleGuard>
  );
}

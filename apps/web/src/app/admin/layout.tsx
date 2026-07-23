"use client";

import { LayoutDashboard, Users } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppTabs, type AppTab } from "@/components/AppTabs";

const TABS: AppTab[] = [
  { href: "/admin", label: "Tableau de bord", shortLabel: "Board", icon: LayoutDashboard, exact: true },
  { href: "/admin/comptes", label: "Comptes", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="admin" nav={<AppTabs tabs={TABS} ariaLabel="Sections de l'espace administrateur" />}>
      {children}
    </RoleGuard>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Car, LayoutDashboard, Radar, Users } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/coach", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/coach/matches", label: "Matchs", icon: CalendarDays },
  { href: "/coach/team", label: "Mon équipe", icon: Users },
  { href: "/coach/carpool", label: "Covoiturage", icon: Car },
  { href: "/coach/radar", label: "Radar", icon: Radar },
];

function CoachTabs() {
  const pathname = usePathname();
  return (
    <nav
      role="tablist"
      aria-label="Sections de l'espace coach"
      className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 md:px-6 flex overflow-x-auto no-scrollbar"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/coach" ? pathname === "/coach" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition",
              active ? "text-white border-gold" : "text-white/55 border-transparent hover:text-white",
            )}
          >
            <Icon size={14} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="coach" nav={<CoachTabs />}>
      {children}
    </RoleGuard>
  );
}

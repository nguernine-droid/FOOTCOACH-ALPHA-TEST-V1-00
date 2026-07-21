"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Radar, Plus } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/coach", label: "Dashboard", icon: LayoutDashboard },
  { href: "/coach/radar", label: "Radar", icon: Radar },
  { href: "/coach/announcements/new", label: "Annonce", icon: Plus },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <RoleGuard role="coach">
      <nav className="flex gap-2 mb-6">
        {TABS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold uppercase tracking-wide transition",
              pathname === href
                ? "border-neon-orange/50 bg-neon-orange/15 text-neon-orange"
                : "border-white/10 text-white/50 hover:text-white hover:bg-white/5",
            )}
          >
            <Icon size={15} /> {label}
          </Link>
        ))}
      </nav>
      {children}
    </RoleGuard>
  );
}

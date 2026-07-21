"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Radar, Plus } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/coach", label: "Mes matchs", icon: LayoutDashboard },
  { href: "/coach/radar", label: "Radar", icon: Radar },
  { href: "/coach/announcements/new", label: "Annonce", icon: Plus },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <RoleGuard role="coach">
      <nav className="card p-1.5 flex gap-1 mb-6">
        {TABS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[1.15rem] text-xs font-bold transition",
              pathname === href ? "bg-pitch text-white shadow-sm" : "text-ink-soft hover:bg-paper hover:text-ink",
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppTab = {
  href: string;
  label: string;
  /** Libellé court pour la barre basse mobile (défaut : label) */
  shortLabel?: string;
  icon: LucideIcon;
  /** Actif uniquement sur correspondance exacte (racines d'espace) */
  exact?: boolean;
};

/**
 * Navigation par onglets partagée entre tous les rôles, deux rendus exclusifs :
 * - ≥ 960px : barre d'onglets sous le header (slot nav de RoleGuard, fond navy-800)
 * - < 960px : barre fixe en bas de l'écran (safe-area iOS respectée)
 * Jamais les deux à la fois.
 */
export function AppTabs({ tabs, ariaLabel }: { tabs: AppTab[]; ariaLabel: string }) {
  const pathname = usePathname();
  const isActive = (tab: AppTab) => (tab.exact ? pathname === tab.href : pathname.startsWith(tab.href));

  return (
    <>
      {/* Desktop : onglets en haut, sous le header */}
      <div className="hidden min-[960px]:block bg-navy-800 border-t border-white/10">
      <nav
        role="tablist"
        aria-label={ariaLabel}
        className="flex w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 md:px-6 overflow-x-auto no-scrollbar"
      >
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition focus-visible:!outline-gold",
                active ? "text-white border-gold" : "text-white/55 border-transparent hover:text-white",
              )}
            >
              <tab.icon size={14} /> {tab.label}
            </Link>
          );
        })}
      </nav>
      </div>

      {/* Mobile : barre fixe en bas de l'écran */}
      <nav
        role="tablist"
        aria-label={ariaLabel}
        className="min-[960px]:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-800 border-t border-white/10 shadow-pop pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex">
          {tabs.map((tab) => {
            const active = isActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={active}
                aria-label={tab.label}
                className={cn(
                  "flex-1 min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-0.5 py-1.5 transition focus-visible:!outline-gold",
                  active ? "text-gold" : "text-white/55 hover:text-white",
                )}
              >
                <tab.icon size={20} aria-hidden />
                <span className="text-[10px] font-bold leading-none truncate max-w-full px-1">
                  {tab.shortLabel ?? tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

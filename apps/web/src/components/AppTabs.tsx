"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Plus, type LucideIcon } from "lucide-react";
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

/** Action de création du bouton « + », déterminée par la page active */
export type QuickAction = {
  href: string;
  /** Ce que le bouton crée, ex. « Publier une annonce » */
  label: string;
};

/**
 * Navigation par onglets partagée entre tous les rôles, deux rendus exclusifs :
 * - ≥ 960px : barre d'onglets sous le header (slot nav de RoleGuard, fond navy-800)
 * - < 960px : barre fixe en bas de l'écran (safe-area iOS respectée)
 * Jamais les deux à la fois.
 *
 * `action` ajoute un bouton « + » doré — surélevé au centre sur mobile, à droite
 * des onglets sur desktop — dont la cible dépend de la page en cours.
 * `moreTabs` regroupe les sections secondaires derrière un menu « Plus ».
 */
export function AppTabs({
  tabs,
  ariaLabel,
  action,
  moreTabs = [],
}: {
  tabs: AppTab[];
  ariaLabel: string;
  action?: QuickAction | null;
  moreTabs?: AppTab[];
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  // Les deux barres coexistent dans le DOM (masquées par CSS) : une ref chacune
  const desktopMoreRef = useRef<HTMLDivElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);

  const isActive = (tab: AppTab) => (tab.exact ? pathname === tab.href : pathname.startsWith(tab.href));
  const moreActive = moreTabs.some(isActive);

  // Le menu secondaire se referme à la navigation et au clic extérieur
  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inside =
        desktopMoreRef.current?.contains(target) === true || mobileMoreRef.current?.contains(target) === true;
      if (!inside) setMoreOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [moreOpen]);

  // Mobile : le « + » s'intercale au milieu des onglets
  const split = Math.ceil(tabs.length / 2);
  const mobileGroups = action ? [tabs.slice(0, split), tabs.slice(split)] : [tabs];

  const moreMenu = moreTabs.length > 0 && moreOpen && (
    <div
      role="menu"
      aria-label="Autres sections"
      className="absolute right-0 bottom-full mb-2 min-[960px]:bottom-auto min-[960px]:top-full min-[960px]:mb-0 min-[960px]:mt-2 w-56 card p-2 text-ink z-50 animate-rise-in"
    >
      {moreTabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          role="menuitem"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition",
            isActive(tab) ? "bg-blue-soft text-navy-700" : "text-ink-soft hover:bg-paper hover:text-ink",
          )}
        >
          <tab.icon size={15} /> {tab.label}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop : onglets en haut, sous le header */}
      <div className="hidden min-[960px]:block bg-navy-800 border-t border-white/10">
        <nav
          role="tablist"
          aria-label={ariaLabel}
          className="flex items-center w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 md:px-6 gap-1"
        >
          <div className="flex min-w-0 overflow-x-auto no-scrollbar">
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
          </div>

          {moreTabs.length > 0 && (
            <div className="relative shrink-0" ref={desktopMoreRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((o) => !o)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition focus-visible:!outline-gold",
                  moreActive ? "text-white border-gold" : "text-white/55 border-transparent hover:text-white",
                )}
              >
                <MoreHorizontal size={14} /> Plus
              </button>
              {moreMenu}
            </div>
          )}

          {action && (
            <Link
              href={action.href}
              aria-label={action.label}
              title={action.label}
              className="ml-auto shrink-0 inline-flex items-center gap-1.5 my-1.5 px-4 py-2 rounded-lg bg-gold text-navy-900 text-xs font-bold transition hover:brightness-105 active:scale-[0.97] focus-visible:!outline-white"
            >
              <Plus size={15} /> {action.label}
            </Link>
          )}
        </nav>
      </div>

      {/* Mobile : barre fixe en bas de l'écran */}
      <nav
        role="tablist"
        aria-label={ariaLabel}
        className="min-[960px]:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-800 border-t border-white/10 shadow-pop pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-stretch">
          {mobileGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex flex-1 min-w-0">
              {group.map((tab) => {
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

              {/* Bouton de création, surélevé entre les deux moitiés d'onglets */}
              {action && groupIndex === 0 && (
                <div className="shrink-0 w-16 flex justify-center">
                  <Link
                    href={action.href}
                    aria-label={action.label}
                    title={action.label}
                    className="-mt-5 w-14 h-14 rounded-full bg-gold text-navy-900 flex items-center justify-center ring-4 ring-navy-800 shadow-pop transition active:scale-95 focus-visible:!outline-white"
                  >
                    <Plus size={26} aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          ))}

          {moreTabs.length > 0 && (
            <div className="relative shrink-0 flex" ref={mobileMoreRef}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                aria-label="Autres sections"
                onClick={() => setMoreOpen((o) => !o)}
                className={cn(
                  "w-16 min-h-[52px] flex flex-col items-center justify-center gap-0.5 py-1.5 transition focus-visible:!outline-gold",
                  moreActive ? "text-gold" : "text-white/55 hover:text-white",
                )}
              >
                <MoreHorizontal size={20} aria-hidden />
                <span className="text-[10px] font-bold leading-none">Plus</span>
              </button>
              {moreMenu}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

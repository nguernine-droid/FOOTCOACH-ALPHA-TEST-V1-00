"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Plus, type LucideIcon } from "lucide-react";
import type { QuickAction } from "@/components/QuickActionContext";
import { useAccountEntry } from "@/components/AccountSheetContext";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

export type { QuickAction };

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
 *
 * `action` ajoute un bouton « + » doré — surélevé au centre sur mobile, à droite
 * des onglets sur desktop — dont la cible dépend de la page en cours.
 *
 * Un dernier emplacement « Moi » ouvre la feuille de compte (profil, équipe
 * active, agenda, notifications, déconnexion). Il n'existe qu'en mobile : sur
 * desktop, cet accès est porté par l'avatar du header.
 */
export function AppTabs({
  tabs,
  ariaLabel,
  action,
}: {
  tabs: AppTab[];
  ariaLabel: string;
  action?: QuickAction | null;
}) {
  const pathname = usePathname();
  const isActive = (tab: AppTab) => (tab.exact ? pathname === tab.href : pathname.startsWith(tab.href));
  const account = useAccountEntry();

  // Même bouton dans les deux barres : lien de création, ou validation du
  // formulaire ouvert (associé par l'attribut `form`, donc à distance).
  const ActionButton = ({ className, children }: { className: string; children: React.ReactNode }) =>
    !action ? null : action.kind === "link" ? (
      <Link href={action.href} aria-label={action.label} title={action.label} className={className}>
        {children}
      </Link>
    ) : (
      <button
        type="submit"
        form={action.formId}
        disabled={action.disabled}
        aria-label={action.label}
        title={action.label}
        className={cn(className, "disabled:opacity-40 disabled:pointer-events-none")}
      >
        {children}
      </button>
    );

  const ActionIcon = action?.kind === "submit" ? Check : Plus;

  // Mobile : le « + » s'intercale entre deux moitiés d'onglets de même largeur
  const split = Math.ceil(tabs.length / 2);
  const mobileGroups = action ? [tabs.slice(0, split), tabs.slice(split)] : [tabs];

  const tabClassName = (active: boolean) =>
    cn(
      "flex-1 min-w-0 min-h-14 flex flex-col items-center justify-center gap-0.5 py-1.5 transition",
      "active:bg-white/10 focus-visible:!outline-gold",
      active ? "text-gold" : "text-white/55 hover:text-white",
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

          <ActionButton className="ml-auto shrink-0 inline-flex items-center gap-1.5 my-1.5 px-4 py-2 rounded-lg bg-gold text-navy-900 text-xs font-bold transition hover:brightness-105 active:scale-[0.97] focus-visible:!outline-white">
            <ActionIcon size={15} /> {action?.label}
          </ActionButton>
        </nav>
      </div>

      {/* Mobile : barre fixe en bas de l'écran */}
      <nav
        role="tablist"
        aria-label={ariaLabel}
        className="min-[960px]:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-800 border-t border-white/10 shadow-pop
          pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        {/* Les deux moitiés sont des frères flex-1 de part et d'autre du « + » :
            chaque onglet garde ainsi la même largeur des deux côtés. */}
        <div className="flex items-stretch">
          {mobileGroups.map((group, groupIndex) => (
            <Fragment key={groupIndex}>
              <div
                className="flex min-w-0"
                // Chaque moitié grandit au prorata du nombre de cases qu'elle
                // porte : sans ça, une moitié d'un seul onglet le rendait deux
                // fois plus large que ses voisins.
                style={{
                  flexGrow: group.length + (account && groupIndex === mobileGroups.length - 1 ? 1 : 0),
                  flexBasis: 0,
                }}
              >
                {group.map((tab) => {
                  const active = isActive(tab);
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      role="tab"
                      aria-selected={active}
                      aria-label={tab.label}
                      className={tabClassName(active)}
                    >
                      <tab.icon size={20} aria-hidden />
                      <span className="text-[10px] font-bold leading-none truncate max-w-full px-1">
                        {tab.shortLabel ?? tab.label}
                      </span>
                    </Link>
                  );
                })}

                {/* Dernier emplacement de la moitié droite : la feuille « Moi » */}
                {account && groupIndex === mobileGroups.length - 1 && (
                  <button
                    type="button"
                    onClick={account.open}
                    aria-haspopup="dialog"
                    aria-label="Mon compte"
                    className={tabClassName(false)}
                  >
                    <span className="relative flex items-center justify-center">
                      <Avatar
                        firstName={account.firstName}
                        lastName={account.lastName}
                        avatarUrl={account.avatarUrl}
                        size={22}
                        className="border border-white/25"
                      />
                      {account.unread && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-gold ring-2 ring-navy-800"
                          aria-label="Nouvelles activités"
                        />
                      )}
                    </span>
                    <span className="text-[10px] font-bold leading-none">Moi</span>
                  </button>
                )}
              </div>

              {/* Bouton de création, surélevé entre les deux moitiés d'onglets */}
              {action && groupIndex === 0 && (
                <div className="shrink-0 w-16 flex justify-center">
                  <ActionButton className="-mt-5 w-14 h-14 rounded-full bg-gold text-navy-900 flex items-center justify-center ring-4 ring-navy-800 shadow-pop transition active:scale-95 focus-visible:!outline-white">
                    <ActionIcon size={26} aria-hidden />
                  </ActionButton>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </nav>
    </>
  );
}

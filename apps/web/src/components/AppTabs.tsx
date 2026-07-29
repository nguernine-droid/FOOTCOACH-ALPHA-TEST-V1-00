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
  /**
   * Pastille de notification portée par cet onglet. `activity` = il reste des
   * activités non lues — l'onglet désigné est celui qui les affiche.
   */
  badge?: "activity";
};

/**
 * Navigation par onglets partagée entre tous les rôles, deux rendus exclusifs :
 * - ≥ 960px : rangée d’onglets sous le header (`.app-subnav`, sur son verre)
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

  const isSubmit = action?.kind === "submit";

  /**
   * Le « + » devient un « ✓ » quand une page de création s'ouvre : les deux
   * icônes sont superposées et pivotent l'une dans l'autre, pour que le
   * changement se lise comme une transformation et non comme un remplacement.
   */
  const MorphIcon = ({ size, strokeWidth = 2 }: { size: number; strokeWidth?: number }) => (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <Plus
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden
        className={cn(
          "absolute transition-all",
          isSubmit ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100",
        )}
      />
      <Check
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden
        className={cn(
          "absolute transition-all",
          isSubmit ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50",
        )}
      />
    </span>
  );

  // Mobile : le « + » s'intercale entre deux moitiés d'onglets de même largeur
  const split = Math.ceil(tabs.length / 2);
  const mobileGroups = action ? [tabs.slice(0, split), tabs.slice(split)] : [tabs];

  // Onglet retenu : icône ET libellé passent à l'or, sans pastille de fond —
  // sur un fond de verre, un aplat derrière l'icône alourdit la barre.
  const tabClassName = (active: boolean) =>
    cn(
      "relative flex-1 min-w-0 min-h-14 flex flex-col items-center justify-center gap-0.5 py-1.5 transition",
      "active:bg-on-structure/10 focus-visible:!outline-accent-solid",
      active ? "text-accent-solid" : "text-on-structure/55 hover:text-on-structure",
    );

  /** Point rouge de notification, en haut à droite de l'icône d'un onglet */
  const NotificationDot = () => (
    <span
      aria-hidden
      className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-alert ring-2 ring-structure-1/70"
    />
  );

  return (
    <>
      {/* Desktop : onglets en haut, sous le header */}
      <div className="app-subnav hidden min-[960px]:block">
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
                    "inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition focus-visible:!outline-accent-solid",
                    active ? "text-on-structure border-accent-solid" : "text-on-structure/55 border-transparent hover:text-on-structure",
                  )}
                >
                  <tab.icon size={14} /> {tab.label}
                </Link>
              );
            })}
          </div>

          <ActionButton className="ml-auto shrink-0 inline-flex items-center gap-1.5 my-1.5 px-4 py-2 rounded-lg bg-accent-solid text-accent-on text-xs font-bold transition hover:brightness-105 active:scale-[0.97] focus-visible:!outline-white">
            <MorphIcon size={15} /> {action?.label}
          </ActionButton>
        </nav>
      </div>

      {/* Mobile : barre fixe en bas de l'écran.
          Le fond, la bordure et le floutage appartiennent entièrement à
          `.app-tabbar` — aucun utilitaire de couleur ici, sans quoi il
          gagnerait sur la recette du thème (les utilitaires priment sur la
          couche `components`) et la barre ne suivrait plus. */}
      <nav
        role="tablist"
        aria-label={ariaLabel}
        className="app-tabbar min-[960px]:hidden fixed bottom-0 inset-x-0 z-40
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
                  const flagged = tab.badge === "activity" && Boolean(account?.unread);
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      role="tab"
                      aria-selected={active}
                      aria-label={flagged ? `${tab.label} — nouvelles activités` : tab.label}
                      className={tabClassName(active)}
                    >
                      {/* Barre dorée qui se déploie sous l'onglet retenu */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-0 h-0.5 w-8 rounded-full bg-accent-solid origin-center transition-transform",
                          active ? "scale-x-100" : "scale-x-0",
                        )}
                      />
                      <span className="relative flex items-center justify-center">
                        <tab.icon
                          size={20}
                          aria-hidden
                          className={cn("transition-transform", active && "-translate-y-px scale-110")}
                        />
                        {flagged && <NotificationDot />}
                      </span>
                      <span className="text-[10px] font-bold leading-none truncate max-w-full px-1">
                        {tab.shortLabel ?? tab.label}
                      </span>
                    </Link>
                  );
                })}

                {/* Dernier emplacement de la moitié droite : la feuille « Moi ».
                    L'avatar tient lieu d'icône ; il prend un liseré doré tant que
                    la feuille est ouverte, comme un onglet retenu. */}
                {account && groupIndex === mobileGroups.length - 1 && (
                  <button
                    type="button"
                    onClick={account.open}
                    aria-haspopup="dialog"
                    aria-expanded={account.isOpen}
                    aria-label="Mon compte"
                    className={tabClassName(account.isOpen)}
                  >
                    <span className="relative flex items-center justify-center">
                      <Avatar
                        firstName={account.firstName}
                        lastName={account.lastName}
                        avatarUrl={account.avatarUrl}
                        size={24}
                        className={cn(
                          "transition",
                          account.isOpen
                            ? "ring-2 ring-accent-solid ring-offset-1 ring-offset-transparent"
                            : "border border-white/25",
                        )}
                      />
                    </span>
                    <span className="text-[10px] font-bold leading-none">Moi</span>
                  </button>
                )}
              </div>

              {/* Bouton de création, surélevé entre les deux moitiés d'onglets.
                  68 px et débordant franchement au-dessus de la barre : c'est
                  l'action la plus importante de l'app, elle doit se voir avant
                  de se lire. Halo doré plutôt qu'anneau opaque — la barre étant
                  en verre, un anneau plein aurait dessiné un disque parasite. */}
              {action && groupIndex === 0 && (
                <div className="shrink-0 w-20 flex justify-center">
                  <ActionButton
                    className="fab -mt-7 w-[68px] h-[68px] rounded-full text-navy-900 flex items-center justify-center
                      transition-transform active:scale-90 focus-visible:!outline-white"
                  >
                    <MorphIcon size={30} strokeWidth={3} />
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

"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronRight, Megaphone, Plus, Trophy, type LucideIcon } from "lucide-react";
import type { QuickAction, QuickChoice } from "@/components/QuickActionContext";
import { useTabBadges } from "@/components/TabBadgesContext";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type { QuickAction };

/** Les clés d'icône des choix, résolues ici — là où les composants existent */
const CHOICE_ICONS: Record<QuickChoice["icon"], LucideIcon> = {
  announcement: Megaphone,
  tournament: Trophy,
};

export type AppTab = {
  href: string;
  label: string;
  /** Libellé court pour la barre basse mobile (défaut : label) */
  shortLabel?: string;
  icon: LucideIcon;
  /** Actif uniquement sur correspondance exacte (racines d'espace) */
  exact?: boolean;
  /**
   * Pastille de notification portée par cet onglet.
   * - `activity` : point rouge tant qu'il reste des activités non lues ;
   * - `messages` : nombre de messages reçus et non lus, chiffré — on ne répond
   *   pas de la même façon à « il s'est passé quelque chose » et à « trois
   *   confrères attendent votre réponse ».
   */
  badge?: "activity" | "messages";
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
 * La barre ne porte QUE des destinations. Le compte, lui, s'ouvre par la photo
 * du header : un menu n'est pas un onglet, il n'a rien à faire dans une rangée
 * qui dit où l'on est.
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
  const badges = useTabBadges();
  /** Feuille des créations possibles, quand le « + » en propose plusieurs */
  const [choosing, setChoosing] = useState(false);

  // Même bouton dans les deux barres : lien de création, choix entre plusieurs,
  // ou validation du formulaire ouvert (associé par l'attribut `form`, donc à
  // distance).
  const ActionButton = ({ className, children }: { className: string; children: React.ReactNode }) => {
    if (!action) return null;
    if (action.kind === "link") {
      return (
        <Link href={action.href} aria-label={action.label} title={action.label} className={className}>
          {children}
        </Link>
      );
    }
    if (action.kind === "choice") {
      return (
        <button
          type="button"
          onClick={() => setChoosing(true)}
          aria-haspopup="dialog"
          aria-expanded={choosing}
          aria-label={action.label}
          title={action.label}
          className={className}
        >
          {children}
        </button>
      );
    }
    return (
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
  };

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

  /** Ce que cet onglet a à signaler : un point, un nombre, ou rien */
  const alertOf = (tab: AppTab): "dot" | number | null => {
    if (!badges) return null;
    if (tab.badge === "activity") return badges.activity ? "dot" : null;
    if (tab.badge === "messages") return badges.messages > 0 ? badges.messages : null;
    return null;
  };

  /** Le libellé de l'onglet tel que l'entend un lecteur d'écran, pastille comprise */
  const labelWithAlert = (tab: AppTab, alert: "dot" | number | null) => {
    if (alert === null) return tab.label;
    if (alert === "dot") return `${tab.label} — nouvelles activités`;
    return `${tab.label} — ${alert} message${alert > 1 ? "s" : ""} non lu${alert > 1 ? "s" : ""}`;
  };

  // Onglet retenu : icône ET libellé passent à l'or, sans pastille de fond —
  // sur un fond de verre, un aplat derrière l'icône alourdit la barre.
  const tabClassName = (active: boolean) =>
    cn(
      "relative flex-1 min-w-0 min-h-14 flex flex-col items-center justify-center gap-0.5 py-1.5 transition",
      "active:bg-on-structure/10 focus-visible:!outline-accent-solid",
      active ? "text-accent-solid" : "text-on-structure/55 hover:text-on-structure",
    );

  /**
   * Pastille de notification, en haut à droite de l'icône d'un onglet. Un point
   * nu quand il n'y a rien à compter, le nombre dès qu'il y a des messages —
   * au-delà de neuf, « 9+ » : le chiffre exact ne change plus rien à la
   * décision d'y aller.
   */
  const NotificationDot = ({ count }: { count?: number }) =>
    count === undefined ? (
      <span
        aria-hidden
        className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-alert ring-2 ring-structure-1/70"
      />
    ) : (
      <span
        aria-hidden
        className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-alert text-white
          text-[10px] font-black leading-none flex items-center justify-center ring-2 ring-structure-1/70"
      >
        {count > 9 ? "9+" : count}
      </span>
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
              const alert = alertOf(tab);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  role="tab"
                  aria-selected={active}
                  aria-label={labelWithAlert(tab, alert)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition focus-visible:!outline-accent-solid",
                    active ? "text-on-structure border-accent-solid" : "text-on-structure/55 border-transparent hover:text-on-structure",
                  )}
                >
                  <tab.icon size={14} /> {tab.label}
                  {/* Sur cette rangée, la pastille SUIT le libellé au lieu de
                      se poser sur l'icône : les onglets y sont écrits en toutes
                      lettres, une pastille superposée mordrait la première. */}
                  {alert === "dot" && <span className="w-1.5 h-1.5 rounded-full bg-alert" aria-hidden />}
                  {typeof alert === "number" && (
                    <span
                      aria-hidden
                      className="min-w-[16px] h-4 px-1 rounded-full bg-alert text-white text-[10px] font-black
                        flex items-center justify-center"
                    >
                      {alert > 9 ? "9+" : alert}
                    </span>
                  )}
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
                style={{ flexGrow: group.length, flexBasis: 0 }}
              >
                {group.map((tab) => {
                  const active = isActive(tab);
                  const alert = alertOf(tab);
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      role="tab"
                      aria-selected={active}
                      aria-label={labelWithAlert(tab, alert)}
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
                        {alert === "dot" && <NotificationDot />}
                        {typeof alert === "number" && <NotificationDot count={alert} />}
                      </span>
                      <span className="text-[10px] font-bold leading-none truncate max-w-full px-1">
                        {tab.shortLabel ?? tab.label}
                      </span>
                    </Link>
                  );
                })}
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

      {/* Deux créations derrière un seul « + ». La feuille plutôt qu'un menu
          déroulant : elle s'ouvre dans la zone du pouce, juste au-dessus du
          bouton pressé, et le même rendu sert au clic sur desktop. */}
      {action?.kind === "choice" && choosing && (
        <BottomSheet
          label={action.label}
          onClose={() => setChoosing(false)}
          footer={
            <Button variant="ghost" className="w-full" onClick={() => setChoosing(false)}>
              Annuler
            </Button>
          }
        >
          <div className="px-5 pt-1 pb-4 space-y-2">
            <h2 className="display text-lg">{action.label}</h2>
            {action.options.map((option) => {
              const Icon = CHOICE_ICONS[option.icon];
              return (
                <Link
                  key={option.href}
                  href={option.href}
                  // Fermeture explicite : la barre d'onglets vit dans la mise en
                  // page, elle ne se démonte pas en changeant de page — sans ça
                  // la feuille resterait ouverte par-dessus l'écran de création.
                  onClick={() => setChoosing(false)}
                  className="flex items-center gap-3 rounded-lg border border-line bg-paper px-4 py-3.5
                    transition hover:border-accent/40 active:scale-[0.985]"
                >
                  <span className="w-10 h-10 rounded-lg bg-accent-surface text-accent flex items-center justify-center shrink-0">
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{option.label}</span>
                    <span className="block text-xs text-ink-soft">{option.description}</span>
                  </span>
                  <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
                </Link>
              );
            })}
          </div>
        </BottomSheet>
      )}
    </>
  );
}

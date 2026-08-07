"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Contact,
  LogOut,
  Megaphone,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ActivityDto, CoachTeamDto, Role, UserDto } from "@footcoach/shared";
import { Avatar } from "@/components/Avatar";
import { ThemePicker } from "@/components/ThemePicker";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<Role, string> = {
  coach: "Coach",
  player: "Joueur",
  parent: "Parent",
  supporter: "Supporter",
  admin: "Administrateur",
  club: "Club",
};

const ACTIVITY_ICONS = { announcement: Megaphone, score: Trophy } as const;

/** Ligne de la feuille : pleine largeur, 56 px de haut, toute la ligne cliquable */
function Row({
  icon: Icon,
  label,
  href,
  onClick,
  right,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const className = cn(
    "w-full min-h-14 flex items-center gap-3 px-5 text-left transition",
    tone === "danger" ? "text-coral active:bg-coral-soft" : "text-ink active:bg-paper hover:bg-paper",
  );
  const inner = (
    <>
      <Icon size={18} className={cn("shrink-0", tone === "danger" ? "text-coral" : "text-blue")} aria-hidden />
      <span className="flex-1 min-w-0 text-sm font-bold truncate">{label}</span>
      {right}
      {tone !== "danger" && <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />}
    </>
  );

  return href ? (
    <Link href={href} onClick={onClick} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

/**
 * Feuille « Moi » : tout ce qui vivait dans le coin haut-droit du header
 * (équipe active, profil, agenda, notifications, déconnexion) rassemblé dans
 * la zone du pouce, ouvert depuis la barre d'onglets basse.
 */
export function AccountSheet({
  user,
  teams,
  activeTeamId,
  onSelectTeam,
  activities,
  onSeenNotifications,
  onClose,
  onLogout,
}: {
  user: UserDto;
  teams: CoachTeamDto[];
  activeTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  /** Fil d'activité du coach — `null` tant qu'il charge, absent pour les autres rôles */
  activities: ActivityDto[] | null;
  /** Appelé à l'ouverture de la liste : éteint la pastille « non-lu » */
  onSeenNotifications: () => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  const [view, setView] = useState<"menu" | "notifications">("menu");
  const isCoach = user.role === "coach";
  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null;
  const now = new Date();

  const footer = (
    <Button variant="ghost" className="w-full" onClick={onClose}>
      Fermer
    </Button>
  );

  if (view === "notifications") {
    return (
      <BottomSheet label="Notifications" onClose={onClose} footer={footer}>
        <div className="sticky top-0 surface z-10 flex items-center gap-2 px-3 py-2 border-b border-line">
          <button
            type="button"
            onClick={() => setView("menu")}
            className="icon-btn text-ink-soft hover:bg-paper"
            aria-label="Revenir au menu"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-black">Notifications</p>
        </div>
        <div className="p-2">
          {!activities && <p className="px-3 py-6 text-xs text-ink-soft animate-soft-pulse">Chargement…</p>}
          {activities?.length === 0 && (
            <p className="px-3 py-6 text-xs text-ink-soft text-center">Aucune notification pour le moment.</p>
          )}
          {activities?.map((ev) => {
            const Icon = ACTIVITY_ICONS[ev.type];
            return (
              <div key={ev.id} className="flex items-start gap-3 px-3 py-3 rounded-lg">
                <span
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    ev.type === "announcement" && "bg-sun-soft text-sun",
                    ev.type === "score" && "bg-success-soft text-success",
                  )}
                >
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-ink leading-snug">
                    <span className="font-bold">{ev.actor}</span> {ev.detail}
                  </p>
                  <p className="text-[11px] text-ink-soft font-semibold">{timeAgo(ev.createdAt, now)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet label="Mon compte" onClose={onClose} footer={footer}>
      {/* Identité, en lecture seule : la carte du coach s'ouvre désormais par la
          photo du header, présente sur tous les écrans. Deux portes vers la
          même carte, dont une cachée dans un menu, n'en valaient qu'une. */}
      <div className="flex items-center gap-3 px-5 py-4">
        <Avatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} size={52} />
        <div className="min-w-0">
          <p className="text-base font-black truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-ink-soft font-semibold truncate">
            {ROLE_LABELS[user.role]}
            {activeTeam ? ` · ${activeTeam.name}` : user.teamName ? ` · ${user.teamName}` : ""}
          </p>
        </div>
      </div>

      {/* Équipe active : la bascule n'a de sens qu'à partir de deux équipes */}
      {isCoach && teams.length > 1 && (
        <div className="border-t border-line pt-2">
          <p className="px-5 pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Équipe active</p>
          {teams.map((team) => {
            const active = team.id === activeTeamId;
            return (
              <button
                key={team.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onSelectTeam(team.id);
                  onClose();
                }}
                className="w-full min-h-14 flex items-center gap-3 px-5 text-left transition active:bg-paper hover:bg-paper"
              >
                <span
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    active ? "bg-blue text-white" : "bg-paper text-ink-soft",
                  )}
                >
                  <Users size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold truncate">{team.name}</span>
                  <span className="block text-[11px] text-ink-soft font-semibold">
                    {team.role === "adjoint" ? "Coach adjoint" : "Coach principal"}
                  </span>
                </span>
                {active && <Check size={18} className="text-blue shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      {/* Apparence. Placée avant les raccourcis de navigation : c'est un
          réglage, pas une destination — on ne quitte pas la feuille pour le
          changer, on le change et on voit le résultat derrière. */}
      <div className="border-t border-line px-5 py-4">
        <h3 className="section-title text-xs text-secondary mb-3">Apparence</h3>
        <ThemePicker />
      </div>

      <div className="border-t border-line py-1">
        {isCoach && (
          <>
            {/* En tête des raccourcis : c'est ce qu'un coach vient vérifier le
                plus souvent — qui a répondu à ce qu'il a publié. L'onglet
                « Annonces » montre désormais celles des autres. */}
            <Row icon={Megaphone} label="Mes annonces" href="/coach/announcements/mine" onClick={onClose} />
            <Row icon={CircleUserRound} label="Mon profil" href="/coach/profile" onClick={onClose} />
            <Row icon={Contact} label="Mes relations" href="/coach/relations" onClick={onClose} />
            <Row icon={Users} label="Mes équipes" href="/coach/team" onClick={onClose} />
            <Row icon={CalendarRange} label="Agenda de l'équipe" href="/coach/agenda" onClick={onClose} />
            <Row
              icon={Bell}
              label="Notifications"
              onClick={() => {
                onSeenNotifications();
                setView("notifications");
              }}
              right={
                activities && activities.length > 0 ? (
                  <span className="chip bg-blue-soft text-primary shrink-0">{activities.length}</span>
                ) : undefined
              }
            />
          </>
        )}
        <Row icon={LogOut} label="Se déconnecter" tone="danger" onClick={onLogout} />
      </div>
    </BottomSheet>
  );
}

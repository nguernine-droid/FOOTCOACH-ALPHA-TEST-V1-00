"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { ActivityDto, CoachTeamDto, Role, UserDto } from "@footcoach/shared";
import { api, getActiveTeamId, getStoredUser, homeForRole, logout, setActiveTeamId } from "@/lib/api";
import { AccountSheet } from "@/components/AccountSheet";
import { AccountSheetContext } from "@/components/AccountSheetContext";
import { ActiveTeamContext } from "@/components/ActiveTeamContext";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { PageTransition } from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const ROLE_SPACES: Record<Role, string> = {
  coach: "Espace coach",
  player: "Espace joueur",
  parent: "Espace parent",
  supporter: "Espace supporter",
  admin: "Administration",
  club: "Espace club",
};

const SHELL_WIDTH = "w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 md:px-6";

export function RoleGuard({
  role,
  nav,
  children,
}: {
  role: Role;
  /** Barre d'onglets pleine largeur, rendue sous le header dans le bloc sticky */
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);
  const [activities, setActivities] = useState<ActivityDto[] | null>(null);
  const [activitySeen, setActivitySeen] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Équipe active du coach : init synchrone depuis le localStorage (déjà posé à la
  // connexion), pour que le premier fetch parte avec le bon X-Team-Id sans re-render.
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => getActiveTeamId());
  // Le fil d'activité n'existe que pour le coach
  const hasNotifications = role === "coach";

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/login");
      return;
    }
    if (stored.role !== role) {
      router.replace(homeForRole(stored.role));
      return;
    }
    setUser(stored);
  }, [role, router]);

  // Réconcilie l'équipe active avec les équipes réelles du coach (sélection
  // périmée → équipe principale). Ne s'applique qu'au rôle coach.
  const coachTeams: CoachTeamDto[] = user?.role === "coach" ? (user.teams ?? []) : [];
  useEffect(() => {
    if (user?.role !== "coach") return;
    const teams = user.teams ?? [];
    const valid = teams.find((t) => t.id === activeTeamId) ? activeTeamId : (teams[0]?.id ?? null);
    if (valid !== activeTeamId) setActiveTeamIdState(valid);
    if (valid) setActiveTeamId(valid);
  }, [user, activeTeamId]);

  const activeTeam = coachTeams.find((t) => t.id === activeTeamId) ?? null;
  const changeActiveTeam = useCallback((teamId: string) => {
    setActiveTeamId(teamId);
    setActiveTeamIdState(teamId);
  }, []);

  // Pastille « non-lu » : dernière activité plus récente que la dernière consultation
  useEffect(() => {
    if (!user || !hasNotifications) return;
    setActivitySeen(localStorage.getItem("fc_activity_seen"));
    api<ActivityDto[]>("/activity")
      .then(setActivities)
      .catch(() => setActivities([]));
  }, [user, hasNotifications]);

  const teamLabel = activeTeam?.name ?? user?.teamName ?? null;
  const unread = Boolean(activities?.[0] && (!activitySeen || activities[0].createdAt > activitySeen));
  const markNotificationsSeen = useCallback(() => {
    const latest = activities?.[0]?.createdAt;
    if (!latest) return;
    localStorage.setItem("fc_activity_seen", latest);
    setActivitySeen(latest);
  }, [activities]);

  // Silhouette du shell plutôt qu'un « Chargement… » plein écran : le header et
  // la barre basse sont déjà à leur place définitive, donc zéro saut au montage.
  if (!user) {
    return (
      <div className="min-h-dvh" aria-busy aria-label="Chargement">
        <header className="sticky top-0 z-40 shadow-pop text-white bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700 pt-[env(safe-area-inset-top)]">
          <div className={cn(SHELL_WIDTH, "h-16 flex items-center gap-3")}>
            <Logo size={34} />
            <p className="display text-xl leading-none select-none">
              FOOT<span className="text-gold">COACH</span>
            </p>
          </div>
        </header>
        <div className={cn(SHELL_WIDTH, "pt-6 pb-28 space-y-4")}>
          <Skeleton className="h-52" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        {nav && (
          <div className="min-[960px]:hidden fixed bottom-0 inset-x-0 h-14 bg-navy-800 border-t border-white/10 pb-[env(safe-area-inset-bottom)]" />
        )}
      </div>
    );
  }

  return (
    <AccountSheetContext.Provider
      value={{
        open: () => setSheetOpen(true),
        unread,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      }}
    >
      <div className="min-h-dvh">
        {/* pt safe-area : en mode « ajouté à l'écran d'accueil », la page passe
            sous la barre d'état — le dégradé navy la prolonge proprement. */}
        <div className="sticky top-0 z-40 shadow-pop pt-[env(safe-area-inset-top)] bg-navy-900">
          {/* Le header ne porte plus aucune action : contexte et titre seulement.
              Tout ce qui était dans le coin haut-droit vit maintenant dans la
              feuille « Moi », ouverte depuis la barre basse (et depuis l'avatar
              sur desktop, où la barre basse n'existe pas). */}
          <header className="text-white bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700">
            <div className={cn(SHELL_WIDTH, "h-16 flex items-center justify-between gap-4")}>
              <div className="flex items-center gap-3 min-w-0">
                <Logo size={34} />
                <div className="min-w-0 leading-tight">
                  <p className="display text-xl leading-none select-none">
                    FOOT<span className="text-gold">COACH</span>
                  </p>
                  <p className="text-[11px] text-white/60 font-semibold truncate">
                    {teamLabel ? `${teamLabel} · ` : ""}
                    {ROLE_SPACES[user.role]}
                  </p>
                </div>
              </div>

              {/* Desktop uniquement : la barre d'onglets y est en haut, il faut
                  donc un accès au compte ailleurs que dans la barre basse. */}
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                aria-label={`Menu de ${user.firstName}`}
                className="hidden min-[960px]:flex items-center gap-2 rounded-lg px-2 py-1.5 shrink-0 hover:bg-white/10 transition"
              >
                <span className="relative">
                  <Avatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    avatarUrl={user.avatarUrl}
                    size={36}
                    className="border border-white/20"
                  />
                  {unread && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gold ring-2 ring-navy-800"
                      aria-label="Nouvelles activités"
                    />
                  )}
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-sm font-bold">Bonjour {user.firstName}</span>
                  <span className="block text-[11px] text-white/60 font-semibold">{ROLE_SPACES[user.role]}</span>
                </span>
                <ChevronDown size={14} className="text-white/60" aria-hidden />
              </button>
            </div>
          </header>

          {nav}
        </div>

        <div className={cn(SHELL_WIDTH, "pt-6", nav ? "pb-28 min-[960px]:pb-12" : "pb-12")}>
          <PageTransition>
            {role === "coach" ? (
              <ActiveTeamContext.Provider
                value={{ teams: coachTeams, activeTeamId, activeTeam, setActiveTeam: changeActiveTeam }}
              >
                {/* Remonte les pages coach au changement d'équipe → refetch avec le bon X-Team-Id */}
                <div key={activeTeamId ?? "none"}>{children}</div>
              </ActiveTeamContext.Provider>
            ) : (
              children
            )}
          </PageTransition>
        </div>

        {sheetOpen && (
          <AccountSheet
            user={user}
            teams={coachTeams}
            activeTeamId={activeTeamId}
            onSelectTeam={changeActiveTeam}
            activities={hasNotifications ? activities : []}
            onSeenNotifications={markNotificationsSeen}
            onClose={() => setSheetOpen(false)}
            onLogout={async () => {
              setSheetOpen(false);
              await logout();
              router.replace("/login");
            }}
          />
        )}
      </div>
    </AccountSheetContext.Provider>
  );
}

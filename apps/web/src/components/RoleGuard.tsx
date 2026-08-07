"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { ActivityDto, CoachTeamDto, Role, UserDto } from "@footcoach/shared";
import {
  api,
  getActiveTeamId,
  getStoredUser,
  homeForRole,
  logout,
  refreshSession,
  setActiveTeamId,
} from "@/lib/api";
import { AccountSheet } from "@/components/AccountSheet";
import { AccountSheetContext } from "@/components/AccountSheetContext";
import { ActiveTeamContext } from "@/components/ActiveTeamContext";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { AppBackdrop } from "@/components/AppBackdrop";
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
  // Le fil d'activité et la carte n'existent que pour le coach
  const hasNotifications = role === "coach";
  const isCoach = role === "coach";

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

  // Après la création d'une équipe : le refresh re-signe le jeton et réécrit
  // le compte stocké, d'où la liste à jour sans repasser par la connexion.
  const reloadTeams = useCallback(async () => {
    const fresh = await refreshSession();
    if (fresh) setUser(fresh);
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
  // Non-lu = plus récent que la dernière consultation, pas juste « présent dans les 15 derniers »
  const unreadCount = activities?.filter((a) => !activitySeen || a.createdAt > activitySeen).length ?? 0;
  const unread = unreadCount > 0;
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
        <AppBackdrop />
        <header className="app-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
          <div className={cn(SHELL_WIDTH, "h-16 flex items-center gap-3")}>
            <Logo size={34} />
            <p className="display text-xl leading-none select-none">
              FOOT<span className="text-accent-solid">COACH</span>
            </p>
          </div>
        </header>
        <div className={cn(SHELL_WIDTH, "pt-6 pb-28 space-y-4")}>
          <Skeleton className="h-52" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        {nav && (
          <div className="app-tabbar min-[960px]:hidden fixed bottom-0 inset-x-0 h-14 pb-[env(safe-area-inset-bottom)]" />
        )}
      </div>
    );
  }

  return (
    <AccountSheetContext.Provider
      value={{
        open: () => setSheetOpen(true),
        isOpen: sheetOpen,
        unread,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      }}
    >
      <div className="min-h-dvh">
        <AppBackdrop />
        {/* pt safe-area : en mode « ajouté à l'écran d'accueil », la page passe
            sous la barre d'état — la structure la prolonge proprement.

            `.app-header` porte la recette du thème : masse bleu nuit le jour,
            verre flouté la nuit, où le halo et le tracé du terrain se
            poursuivent dessous au lieu de s'arrêter net. */}
        <div className="app-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
          {/* Le header porte UNE action, et une seule : la photo, qui ouvre la
              carte du coach. C'est un revirement assumé de la règle « header
              sans action » — la carte est ce qu'on montre de soi, sa place est
              là où l'on se reconnaît, pas au fond d'un menu. Le reste du
              compte vit toujours dans la feuille « Moi ». */}
          <header className="text-on-structure">
            <div className={cn(SHELL_WIDTH, "h-16 flex items-center justify-between gap-4")}>
              <div className="flex items-center gap-3 min-w-0">
                <Logo size={34} />
                <div className="min-w-0 leading-tight">
                  <p className="display text-xl leading-none select-none">
                    FOOT<span className="text-accent-solid">COACH</span>
                  </p>
                  <p className="text-[11px] text-white/60 font-semibold truncate">
                    {teamLabel ? `${teamLabel} · ` : ""}
                    {ROLE_SPACES[user.role]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* La carte n'existe que pour le coach : elle parle de points et
                    de matchs encadrés. Les autres rôles gardent l'avatar dans
                    le bouton de compte, comme avant. */}
                {isCoach && (
                  <Link
                    href="/coach/card"
                    aria-label="Ma carte de coach"
                    className="p-1 rounded-lg transition hover:bg-white/10 active:scale-95"
                  >
                    <Avatar
                      firstName={user.firstName}
                      lastName={user.lastName}
                      avatarUrl={user.avatarUrl}
                      size={36}
                      className="border border-white/20"
                    />
                  </Link>
                )}

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
                  {!isCoach && (
                    <Avatar
                      firstName={user.firstName}
                      lastName={user.lastName}
                      avatarUrl={user.avatarUrl}
                      size={36}
                      className="border border-white/20"
                    />
                  )}
                  <span className="text-left leading-tight">
                    <span className="block text-sm font-bold">Bonjour {user.firstName}</span>
                    <span className="block text-[11px] text-white/60 font-semibold">{ROLE_SPACES[user.role]}</span>
                  </span>
                  <span className="relative">
                    <ChevronDown size={14} className="text-white/60" aria-hidden />
                    {/* La pastille suit le menu, pas la photo : c'est là que se
                        lisent les activités. Sur mobile, elle est portée par
                        l'onglet « Moi » de la barre basse. */}
                    {unread && (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-accent-solid ring-2 ring-structure-2"
                        aria-label="Nouvelles activités"
                      />
                    )}
                  </span>
                </button>
              </div>
            </div>
          </header>

          {nav}
        </div>

        <div className={cn(SHELL_WIDTH, "pt-6", nav ? "pb-28 min-[960px]:pb-12" : "pb-12")}>
          <PageTransition>
            {role === "coach" ? (
              <ActiveTeamContext.Provider
                value={{
                  teams: coachTeams,
                  activeTeamId,
                  activeTeam,
                  setActiveTeam: changeActiveTeam,
                  reloadTeams,
                }}
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
            unreadCount={hasNotifications ? unreadCount : 0}
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

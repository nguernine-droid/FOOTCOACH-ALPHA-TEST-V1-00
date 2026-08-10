"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { TabBadgesContext } from "@/components/TabBadgesContext";
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
  const pathname = usePathname();
  const [user, setUser] = useState<UserDto | null>(null);
  const [activities, setActivities] = useState<ActivityDto[] | null>(null);
  const [activitySeen, setActivitySeen] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Équipe active du coach : init synchrone depuis le localStorage (déjà posé à la
  // connexion), pour que le premier fetch parte avec le bon X-Team-Id sans re-render.
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => getActiveTeamId());
  /** Messages reçus et non lus, tous fils confondus — la pastille de l'onglet */
  const [unreadMessages, setUnreadMessages] = useState(0);
  // Le fil d'activité, la carte et la messagerie n'existent que pour le coach
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
    // Session d'avant le surnom : le compte stocké ne le porte pas encore.
    // Une relecture silencieuse le complète, sans forcer la reconnexion.
    if (!stored.nickname) refreshSession().then((fresh) => fresh && setUser(fresh));
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

  /**
   * Compteur de messages non lus, relu à chaque changement d'écran et, à
   * défaut, toutes les minutes.
   *
   * Le changement d'écran est ce qui compte : sans lui, la pastille resterait
   * allumée jusqu'à une minute après qu'on a lu le fil, ce qui donnerait le
   * sentiment de ne jamais en venir à bout. La minute n'est là que pour le
   * coach qui laisse son téléphone ouvert sur le même écran.
   */
  const readUnreadMessages = useCallback(() => {
    if (!isCoach) return;
    api<{ count: number }>("/conversations/unread")
      .then(({ count }) => setUnreadMessages(count))
      .catch(() => undefined);
  }, [isCoach]);

  useEffect(() => {
    if (!user || !isCoach) return;
    readUnreadMessages();
    const timer = setInterval(readUnreadMessages, 60_000);
    return () => clearInterval(timer);
  }, [user, isCoach, pathname, readUnreadMessages]);

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
        <AppBackdrop />
        <header className="app-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
          {/* Même gabarit que le header définitif — photo à droite comprise —
              pour que le titre ne se déplace pas une fois le compte chargé. */}
          <div className={cn(SHELL_WIDTH, "h-16 flex items-center gap-3")}>
            <Logo size={30} className="hidden min-[380px]:inline-flex" />
            <p className="display text-xl leading-none select-none">
              FOOT<span className="text-accent-solid">COACH</span>
            </p>
            <span className="shrink-0 ml-auto -mr-1 p-1">
              <span className="block w-9 h-9 rounded-full bg-white/10" />
            </span>
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
    <TabBadgesContext.Provider
      value={{ activity: unread, messages: unreadMessages, refreshMessages: readUnreadMessages }}
    >
      <div className="min-h-dvh">
        <AppBackdrop />
        {/* pt safe-area : en mode « ajouté à l'écran d'accueil », la page passe
            sous la barre d'état — la structure la prolonge proprement.

            `.app-header` porte la recette du thème : masse bleu nuit le jour,
            verre flouté la nuit, où le halo et le tracé du terrain se
            poursuivent dessous au lieu de s'arrêter net. */}
        <div className="app-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
          {/* Le header porte UNE action, et une seule : la photo, tout à droite,
              qui ouvre le menu « Moi ». C'est le geste appris ailleurs — sa
              propre tête en haut à droite ouvre son compte — et il vaut à toutes
              les largeurs, ce qui évite d'avoir deux portes différentes vers le
              même menu selon la taille de l'écran. La carte du coach, elle, a
              rejoint le menu : elle s'ouvre par son nom, en tête de feuille. */}
          <header className="text-on-structure">
            <div className={cn(SHELL_WIDTH, "h-16 flex items-center gap-3")}>
              <Logo size={30} className="hidden min-[380px]:inline-flex" />

              {/* Le nom de l'application cède la place avant la photo sur les
                  très petits écrans : on sait toujours où l'on est, la marque
                  se rappelle par son blason. */}
              <div className="min-w-0 leading-tight">
                <p className="display text-xl leading-none select-none">
                  FOOT<span className="text-accent-solid">COACH</span>
                </p>
                <p className="text-[11px] text-white/60 font-semibold truncate">
                  {teamLabel ? `${teamLabel} · ` : ""}
                  {ROLE_SPACES[user.role]}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={sheetOpen}
                aria-label={`Menu de ${user.nickname}`}
                className="shrink-0 ml-auto -mr-1 p-1 rounded-full transition hover:bg-white/10 active:scale-95
                  focus-visible:outline-accent"
              >
                <Avatar
                  name={user.nickname}
                  avatarUrl={user.avatarUrl}
                  size={36}
                  className={cn(
                    "transition",
                    sheetOpen
                      ? "ring-2 ring-accent-solid ring-offset-2 ring-offset-transparent"
                      : "border border-white/20",
                  )}
                />
              </button>
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
    </TabBadgesContext.Provider>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Car, ChevronDown, LogOut, Megaphone, UserCheck } from "lucide-react";
import type { ActivityDto, Role, UserDto } from "@footcoach/shared";
import { api, getStoredUser, homeForRole, logout } from "@/lib/api";
import { ClubCrest } from "@/components/ClubCrest";
import { PendingScreen } from "@/components/PendingScreen";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

const ACTIVITY_ICONS = {
  attendance: UserCheck,
  carpool: Car,
  announcement: Megaphone,
} as const;

const ROLE_LABELS: Record<Role, string> = {
  coach: "Coach",
  player: "Joueur",
  parent: "Parent",
  supporter: "Supporter",
};

const ROLE_SPACES: Record<Role, string> = {
  coach: "Espace coach",
  player: "Espace joueur",
  parent: "Espace parent",
  supporter: "Espace supporter",
};

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityDto[] | null>(null);
  const [activitySeen, setActivitySeen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  // Le supporter n'a pas accès au fil d'activité : pas de cloche pour lui
  const hasNotifications = role !== "supporter";

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

  // Joueur/parent sans équipe : demande d'adhésion pas encore acceptée par le coach
  const isPending = user != null && (user.role === "player" || user.role === "parent") && user.teamId === null;

  // Point "non-lu" sur la cloche : dernière activité plus récente que la dernière consultation
  useEffect(() => {
    if (!user || !hasNotifications || isPending) return;
    setActivitySeen(localStorage.getItem("fc_activity_seen"));
    api<ActivityDto[]>("/activity")
      .then(setActivities)
      .catch(() => setActivities([]));
  }, [user, hasNotifications, isPending]);

  useEffect(() => {
    if (!menuOpen && !notifOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen, notifOpen]);

  if (!user) {
    return <div className="min-h-dvh flex items-center justify-center text-ink-soft animate-soft-pulse">Chargement…</div>;
  }

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-40 shadow-pop">
        <header className="text-white bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700">
          <div className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <ClubCrest size={34} />
              <div className="min-w-0 leading-tight">
                <p className="display text-xl leading-none select-none">
                  FOOT<span className="text-gold">COACH</span>
                </p>
                <p className="text-[11px] text-white/60 font-semibold truncate">
                  {user.teamName ? `${user.teamName} · ` : ""}
                  {ROLE_SPACES[user.role]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {hasNotifications && (
                <div className="relative" ref={notifRef}>
                  <button
                    className="relative p-2.5 rounded-lg hover:bg-white/10 transition"
                    aria-label="Notifications"
                    aria-haspopup="menu"
                    aria-expanded={notifOpen}
                    onClick={() => {
                      const latest = activities?.[0]?.createdAt;
                      setNotifOpen((o) => !o);
                      if (latest) {
                        localStorage.setItem("fc_activity_seen", latest);
                        setActivitySeen(latest);
                      }
                    }}
                  >
                    <Bell size={18} className="text-white/80" />
                    {activities?.[0] && (!activitySeen || activities[0].createdAt > activitySeen) && (
                      <span
                        className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold ring-2 ring-navy-900"
                        aria-label="Nouvelles activités"
                      />
                    )}
                  </button>

                  {notifOpen && (
                    <div
                      role="menu"
                      aria-label="Notifications"
                      className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] card p-2 text-ink z-50 animate-rise-in"
                    >
                      <p className="px-3 py-2 text-sm font-bold border-b border-line mb-1">Notifications</p>
                      <div className="max-h-80 overflow-y-auto">
                        {!activities && (
                          <p className="px-3 py-4 text-xs text-ink-soft animate-soft-pulse">Chargement…</p>
                        )}
                        {activities && activities.length === 0 && (
                          <p className="px-3 py-4 text-xs text-ink-soft">Aucune notification pour le moment.</p>
                        )}
                        {activities?.map((ev) => {
                          const Icon = ACTIVITY_ICONS[ev.type];
                          return (
                            <div key={ev.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg hover:bg-paper transition">
                              <span
                                className={cn(
                                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                  ev.type === "attendance" && "bg-success-soft text-success",
                                  ev.type === "carpool" && "bg-blue-soft text-blue",
                                  ev.type === "announcement" && "bg-sun-soft text-sun",
                                )}
                              >
                                <Icon size={13} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs text-ink leading-snug">
                                  <span className="font-bold">{ev.actor}</span> {ev.detail}
                                </p>
                                <p className="text-[10px] text-ink-faint font-semibold">
                                  {timeAgo(ev.createdAt, new Date())}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 transition"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={`Menu de ${user.firstName}`}
                >
                  <span className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center font-black text-xs">
                    {initials}
                  </span>
                  <span className="hidden sm:block text-left leading-tight">
                    <span className="block text-sm font-bold">Bonjour {user.firstName}</span>
                    <span className="block text-[11px] text-white/60 font-semibold">{ROLE_LABELS[user.role]}</span>
                  </span>
                  <ChevronDown size={14} className={cn("text-white/60 transition-transform", menuOpen && "rotate-180")} />
                </button>

                {menuOpen && (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-56 card p-2 text-ink z-50 animate-rise-in">
                    <div className="px-3 py-2 border-b border-line mb-1">
                      <p className="text-sm font-bold truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-ink-soft truncate">
                        {ROLE_LABELS[user.role]}
                        {user.teamName && ` · ${user.teamName}`}
                      </p>
                    </div>
                    <button
                      role="menuitem"
                      onClick={async () => {
                        await logout();
                        router.replace("/login");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-soft hover:text-coral hover:bg-coral-soft transition"
                    >
                      <LogOut size={15} /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {!isPending && nav}
      </div>

      <div
        className={cn(
          "w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto px-4 md:px-6 pt-6",
          // La barre de navigation mobile est fixée en bas : réserver la place du contenu
          nav && !isPending ? "pb-28 min-[960px]:pb-12" : "pb-12",
        )}
      >
        {isPending ? <PendingScreen user={user} onRefreshed={setUser} /> : children}
      </div>
    </div>
  );
}

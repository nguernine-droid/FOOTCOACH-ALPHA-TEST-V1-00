"use client";

import type { AuthResponseDto, Role, UserDto } from "@footcoach/shared";

const ACCESS_KEY = "fc_access_token";
const REFRESH_KEY = "fc_refresh_token";
const USER_KEY = "fc_user";
// Coach multi-équipes : équipe active envoyée en header X-Team-Id sur chaque appel
const ACTIVE_TEAM_KEY = "fc_active_team";

export function getStoredUser(): UserDto | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as UserDto) : null;
}

export function getActiveTeamId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_TEAM_KEY);
}

export function setActiveTeamId(teamId: string) {
  localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
}

// Aligne l'équipe active stockée sur les équipes réelles du coach : garde la
// sélection si elle est encore valide, sinon retombe sur l'équipe principale.
// Pour les autres rôles, aucune équipe active n'est nécessaire.
function syncActiveTeam(user: UserDto) {
  if (user.role !== "coach" || !user.teams?.length) {
    localStorage.removeItem(ACTIVE_TEAM_KEY);
    return;
  }
  const current = localStorage.getItem(ACTIVE_TEAM_KEY);
  if (!current || !user.teams.some((t) => t.id === current)) {
    localStorage.setItem(ACTIVE_TEAM_KEY, user.teams[0].id);
  }
}

export function homeForRole(role: Role): string {
  return { coach: "/coach", player: "/player", parent: "/parent", supporter: "/supporter", admin: "/admin", club: "/club" }[role];
}

function storeSession(auth: AuthResponseDto) {
  localStorage.setItem(ACCESS_KEY, auth.accessToken);
  localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  syncActiveTeam(auth.user);
}

export function updateStoredUser(user: UserDto) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  syncActiveTeam(user);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACTIVE_TEAM_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Single-flight : plusieurs requêtes en 401 simultané partagent le même refresh,
// sinon la rotation du token invalide la session (course entre refresh concurrents).
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return false;
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearSession();
        return false;
      }
      storeSession((await res.json()) as AuthResponseDto);
      return true;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/**
 * Force un refresh de session : re-signe le JWT côté serveur (teamId à jour)
 * et réécrit fc_user. Utilisé par l'écran "demande en attente" pour détecter
 * l'acceptation par le coach sans re-login.
 */
export async function refreshSession(): Promise<UserDto | null> {
  return (await tryRefresh()) ? getStoredUser() : null;
}

// Client API : Bearer automatique + refresh transparent sur 401
export async function api<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const token = localStorage.getItem(ACCESS_KEY);
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && !retried && (await tryRefresh())) {
    return api<T>(path, options, true);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? `Erreur ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function register(path: "/auth/register-coach" | "/auth/register-join", payload: unknown): Promise<UserDto> {
  const auth = await api<AuthResponseDto>(path, { method: "POST", body: JSON.stringify(payload) });
  storeSession(auth);
  return auth.user;
}

export async function login(email: string, password: string): Promise<UserDto> {
  const auth = await api<AuthResponseDto>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  storeSession(auth);
  return auth.user;
}

export async function logout() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (refreshToken) {
    await api("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
  }
  clearSession();
}

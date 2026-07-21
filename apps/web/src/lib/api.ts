"use client";

import type { AuthResponseDto, Role, UserDto } from "@footcoach/shared";

const ACCESS_KEY = "fc_access_token";
const REFRESH_KEY = "fc_refresh_token";
const USER_KEY = "fc_user";

export function getStoredUser(): UserDto | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as UserDto) : null;
}

export function homeForRole(role: Role): string {
  return { coach: "/coach", player: "/player", parent: "/parent", supporter: "/supporter" }[role];
}

function storeSession(auth: AuthResponseDto) {
  localStorage.setItem(ACCESS_KEY, auth.accessToken);
  localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function updateStoredUser(user: UserDto) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function tryRefresh(): Promise<boolean> {
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

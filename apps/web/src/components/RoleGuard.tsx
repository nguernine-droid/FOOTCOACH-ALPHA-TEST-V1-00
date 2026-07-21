"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { Role, UserDto } from "@footcoach/shared";
import { getStoredUser, homeForRole, logout } from "@/lib/api";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<Role, string> = {
  coach: "Coach",
  player: "Joueur",
  parent: "Parent",
  supporter: "Supporter",
};

const ROLE_COLORS: Record<Role, string> = {
  coach: "bg-pitch",
  player: "bg-sky",
  parent: "bg-tangerine",
  supporter: "bg-sun",
};

export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);

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

  if (!user) {
    return <div className="min-h-dvh flex items-center justify-center text-ink-soft animate-soft-pulse">Chargement…</div>;
  }

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-dvh max-w-lg mx-auto px-4 pb-12">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-sm",
              ROLE_COLORS[user.role],
            )}
          >
            {initials}
          </div>
          <div>
            <p className="text-base font-black leading-tight">Salut {user.firstName} 👋</p>
            <p className="text-xs text-ink-soft font-semibold">
              {ROLE_LABELS[user.role]}
              {user.teamName && ` · ${user.teamName}`}
            </p>
          </div>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="p-3 rounded-2xl bg-white border border-line text-ink-soft hover:text-coral hover:border-coral/30 transition"
          aria-label="Se déconnecter"
        >
          <LogOut size={17} />
        </button>
      </header>
      {children}
    </div>
  );
}

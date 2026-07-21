"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { Role, UserDto } from "@footcoach/shared";
import { getStoredUser, homeForRole, logout } from "@/lib/api";

const ROLE_LABELS: Record<Role, string> = {
  coach: "Coach",
  player: "Joueur",
  parent: "Parent",
  supporter: "Supporter",
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
    return <div className="min-h-dvh flex items-center justify-center text-white/40 animate-soft-pulse">Chargement…</div>;
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto px-4 pb-10">
      <header className="flex items-center justify-between py-5">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-neon-orange font-bold">{ROLE_LABELS[user.role]}</p>
          <h1 className="text-lg font-bold">
            {user.firstName} {user.lastName}
          </h1>
          {user.teamName && <p className="text-xs text-white/50">{user.teamName}</p>}
        </div>
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="p-3 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition"
          aria-label="Se déconnecter"
        >
          <LogOut size={18} />
        </button>
      </header>
      {children}
    </div>
  );
}

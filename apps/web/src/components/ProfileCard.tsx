"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Mail, Users } from "lucide-react";
import type { Role, UserDto } from "@footcoach/shared";
import { api, getStoredUser, logout, updateStoredUser } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const ROLE_LABELS: Record<Role, string> = {
  coach: "Coach",
  player: "Joueur",
  parent: "Parent",
  supporter: "Supporter",
  admin: "Administrateur",
  club: "Club",
};

/** Carte d'identité du compte, partagée par les onglets Profil de tous les rôles */
export function ProfileCard() {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
    // Rafraîchit la fiche (poste/maillot notamment) — la session stockée peut dater
    api<UserDto>("/me")
      .then((fresh) => {
        updateStoredUser(fresh);
        setUser(fresh);
      })
      .catch(() => undefined);
  }, []);

  if (!user) return <Skeleton className="h-48" />;

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-4">
        <span className="w-14 h-14 rounded-full bg-navy-700 text-white flex items-center justify-center text-lg font-black shrink-0">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-base font-black truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-ink-soft font-semibold">{ROLE_LABELS[user.role]}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2.5 bg-paper rounded-lg px-4 py-2.5">
          <Mail size={14} className="text-blue shrink-0" />
          <span className="font-semibold truncate">{user.email}</span>
        </p>
        {user.teamName && (
          <p className="flex items-center gap-2.5 bg-paper rounded-lg px-4 py-2.5">
            <Users size={14} className="text-blue shrink-0" />
            <span className="font-semibold truncate">{user.teamName}</span>
          </p>
        )}
      </div>

      <Button
        variant="danger"
        className="w-full"
        onClick={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        <LogOut size={15} /> Se déconnecter
      </Button>
    </div>
  );
}

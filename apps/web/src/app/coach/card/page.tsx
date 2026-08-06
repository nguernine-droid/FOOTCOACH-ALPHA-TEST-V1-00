"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { levelForPoints, type UserDto } from "@footcoach/shared";
import { api, getStoredUser, updateStoredUser } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { CoachCard } from "@/components/coach/CoachCard";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Carte du coach — ce qu'il montre de lui.
 *
 * Le compte stocké sert d'affichage immédiat, puis la fiche est relue : les
 * points et le nombre de matchs bougent à chaque rencontre, et une carte qui
 * afficherait le total d'avant-hier n'aurait aucun intérêt.
 */
export default function CoachCardPage() {
  const { activeTeam } = useActiveTeam();
  const [user, setUser] = useState<UserDto | null>(() => getStoredUser());

  useEffect(() => {
    api<UserDto>("/me")
      .then((fresh) => {
        setUser(fresh);
        updateStoredUser(fresh);
      })
      .catch(() => undefined);
  }, []);

  if (!user) return <Skeleton className="h-[520px] max-w-[340px] mx-auto" />;

  const points = user.points ?? 0;
  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <Link
        href="/coach"
        className="inline-flex items-center gap-1.5 min-h-11 -ml-2 px-2 rounded-lg text-xs font-bold text-ink-soft
          transition hover:text-ink active:bg-paper"
      >
        <ArrowLeft size={16} /> Retour au tableau de bord
      </Link>

      <CoachCard
        firstName={user.firstName}
        lastName={user.lastName}
        avatarUrl={user.avatarUrl}
        // Aucun club n'est rattaché en V1 : l'équipe active tient ce rôle,
        // c'est elle que les autres coachs voient sur le radar.
        clubLabel={user.clubName ?? activeTeam?.name ?? user.teamName}
        teamCategory={activeTeam?.category ?? null}
        level={user.level ?? levelForPoints(points)}
        points={points}
        matchesPlayed={user.matchesPlayed ?? 0}
        categories={user.categories ?? []}
      />

      {!user.avatarUrl && (
        <p className="text-xs text-ink-soft text-center max-w-[340px] mx-auto">
          Votre carte porte vos initiales : ajoutez une photo dans Mon profil pour qu&apos;elle vous ressemble.
        </p>
      )}

      <ButtonLink href="/coach/profile" variant="soft" className="w-full max-w-[340px] mx-auto flex">
        <Camera size={15} /> Modifier mon profil
      </ButtonLink>
    </div>
  );
}

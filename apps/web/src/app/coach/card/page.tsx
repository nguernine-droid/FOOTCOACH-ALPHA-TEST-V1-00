"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Copy, QrCode } from "lucide-react";
import { coachQrPayload, levelForPoints, type UserDto } from "@footcoach/shared";
import { api, getStoredUser, updateStoredUser } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { CoachCard, CoachCardBack } from "@/components/coach/CoachCard";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { Button, ButtonLink } from "@/components/ui/Button";
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
  /** Carte retournée : son dos porte le QR à faire scanner */
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

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

      {/* Le QR est le DOS de la carte, pas une feuille par-dessus : on la
          retourne comme on retourne une carte à jouer. Toute la carte est la
          cible — c'est le geste réel au bord du terrain. */}
      <div className="flip-scene max-w-[340px] mx-auto">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
          aria-label={flipped ? "Revenir au recto de ma carte" : "Retourner ma carte pour afficher mon QR code"}
          className={cn("flip-inner block w-full rounded-2xl focus-visible:outline-accent", flipped && "is-flipped")}
        >
          <span className="flip-face block">
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
          </span>

          <span className="flip-face flip-back block">
            <CoachCardBack firstName={user.firstName} lastName={user.lastName} coachCode={user.coachCode ?? null}>
              {user.coachCode && (
                <QrCodeCanvas value={coachQrPayload(user.coachCode)} label="Mon QR code coach" size={150} />
              )}
            </CoachCardBack>
          </span>
        </button>
      </div>

      <p className="text-xs text-ink-soft text-center max-w-[340px] mx-auto flex items-center justify-center gap-1.5">
        <QrCode size={13} aria-hidden />
        {flipped ? "Touchez la carte pour la remettre à l'endroit." : "Touchez la carte : son dos porte votre QR code."}
      </p>

      {/* Le code se copie depuis le recto : sur le dos, le bouton aurait été
          un second geste dans le geste de retourner. */}
      {flipped && user.coachCode && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(user.coachCode!).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                },
                () => undefined,
              );
            }}
          >
            <Copy size={14} /> {copied ? "Code copié" : "Copier mon code"}
          </Button>
        </div>
      )}

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

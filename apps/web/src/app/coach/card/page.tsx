"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Copy, QrCode } from "lucide-react";
import { coachQrPayload, levelForPoints, type UserDto } from "@footcoach/shared";
import { api, getStoredUser, updateStoredUser } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { CoachCard } from "@/components/coach/CoachCard";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { BottomSheet } from "@/components/ui/BottomSheet";
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
  /** QR de la carte : ce qu'on présente à un confrère pour qu'il vous ajoute */
  const [qrOpen, setQrOpen] = useState(false);
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

      {/* Toute la carte est la cible : on la tend à quelqu'un, il la scanne.
          C'est le geste réel au bord du terrain, et il n'y a rien d'autre à
          faire d'une carte que de la montrer. */}
      <button
        type="button"
        onClick={() => setQrOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={qrOpen}
        aria-label="Afficher mon QR code à faire scanner"
        className="block w-full rounded-card transition active:scale-[0.99] focus-visible:outline-accent"
      >
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
      </button>

      <p className="text-xs text-ink-soft text-center max-w-[340px] mx-auto flex items-center justify-center gap-1.5">
        <QrCode size={13} aria-hidden /> Touchez la carte pour afficher votre QR code.
      </p>

      {!user.avatarUrl && (
        <p className="text-xs text-ink-soft text-center max-w-[340px] mx-auto">
          Votre carte porte vos initiales : ajoutez une photo dans Mon profil pour qu&apos;elle vous ressemble.
        </p>
      )}

      <ButtonLink href="/coach/profile" variant="soft" className="w-full max-w-[340px] mx-auto flex">
        <Camera size={15} /> Modifier mon profil
      </ButtonLink>

      {qrOpen && (
        <BottomSheet
          label="Mon QR code coach"
          onClose={() => setQrOpen(false)}
          footer={
            <Button variant="ghost" className="w-full" onClick={() => setQrOpen(false)}>
              Fermer
            </Button>
          }
        >
          <div className="px-5 pt-1 pb-4 space-y-4 text-center">
            <div className="space-y-1">
              <h2 className="display text-lg">Faites-vous ajouter</h2>
              <p className="text-xs text-ink-soft">
                Un confrère scanne ce code depuis Mes relations, et vous êtes ajoutés l&apos;un chez l&apos;autre.
              </p>
            </div>

            {user.coachCode ? (
              <div className="flex flex-col items-center gap-3">
                <QrCodeCanvas value={coachQrPayload(user.coachCode)} label="Mon QR code coach" />
                {/* Le code en toutes lettres sous le QR : au téléphone, ou quand
                    l'appareil photo d'en face ne veut rien savoir. */}
                <div className="flex items-center gap-2">
                  <span className="display text-3xl tracking-[0.3em] text-primary">{user.coachCode}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(user.coachCode!).then(
                        () => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        },
                        () => undefined,
                      );
                    }}
                    aria-label="Copier mon code coach"
                    className="icon-btn text-ink-soft hover:text-blue hover:bg-blue-soft"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                {copied && <p className="text-xs font-bold text-success">Code copié</p>}
              </div>
            ) : (
              <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
                Votre code sera généré à votre prochaine connexion.
              </p>
            )}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

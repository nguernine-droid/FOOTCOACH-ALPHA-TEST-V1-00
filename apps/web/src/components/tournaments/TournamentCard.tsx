"use client";

import Link from "next/link";
import { AlertTriangle, CalendarDays, MapPin, Trophy, Users } from "lucide-react";
import { categoryLabel, MATCH_GENDER_LABELS, type TournamentDto } from "@footcoach/shared";
import { cn, formatDate } from "@/lib/utils";

/**
 * Un tournoi, en carte. Sert au radar comme à « Mes tournois ».
 *
 * L'affiche est mise en bandeau quand il y en a une : c'est le seul contenu de
 * l'application que l'organisateur a composé lui-même, et c'est ce qui donne
 * envie de s'inscrire. Sans affiche, un bandeau dessiné tient la place plutôt
 * qu'un vide — une carte amputée se lirait comme un tournoi bâclé.
 */
export function TournamentCard({ tournament, className }: { tournament: TournamentDto; className?: string }) {
  const complet = tournament.slotsLeft === 0;
  const dates = tournament.endDate
    ? `${formatDate(tournament.date)} → ${formatDate(tournament.endDate)}`
    : formatDate(tournament.date);

  return (
    <Link
      href={`/coach/tournaments/${tournament.id}`}
      className={cn(
        "card block overflow-hidden transition hover:border-blue/40 active:scale-[0.995]",
        tournament.isSos && "border-coral/40",
        className,
      )}
    >
      {tournament.posterUrl ? (
        // Affiche fournie : servie par l'API, pas d'optimisation next/image
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tournament.posterUrl}
          alt={`Affiche du tournoi ${tournament.name}`}
          className="w-full aspect-[16/9] object-cover bg-paper"
        />
      ) : (
        <div className="w-full aspect-[16/9] flex items-center justify-center bg-structure-1 text-white/25">
          <Trophy size={40} aria-hidden />
        </div>
      )}

      <div className="p-4 space-y-3">
        {tournament.isSos && (
          <p className="rounded-lg bg-coral-soft px-3 py-2 text-xs font-bold text-coral flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-px" aria-hidden />
            <span>
              Une place s&apos;est libérée — une équipe s&apos;est retirée
              {tournament.sosDetails ? ` : ${tournament.sosDetails}` : ""}
            </span>
          </p>
        )}

        <div className="space-y-1 min-w-0">
          <p className="display text-lg leading-tight truncate">{tournament.name}</p>
          <p className="text-xs text-ink-soft truncate">Organisé par {tournament.team.name}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-paper text-ink-soft">{categoryLabel(tournament.category)}</span>
          {tournament.gender && (
            <span className="chip bg-paper text-ink-soft">{MATCH_GENDER_LABELS[tournament.gender]}</span>
          )}
          <span className="chip bg-paper text-ink-soft">{tournament.format}</span>
        </div>

        <div className="space-y-1 text-xs text-ink-soft">
          <p className="flex items-center gap-1.5 capitalize">
            <CalendarDays size={13} className="shrink-0" aria-hidden /> {dates} · {tournament.time}
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <MapPin size={13} className="shrink-0" aria-hidden /> {tournament.stadium}, {tournament.city}
            {tournament.distanceKm !== null && ` · ${Math.round(tournament.distanceKm)} km`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-line">
          <span
            className={cn(
              "chip mt-3",
              complet ? "bg-paper text-ink-soft" : "bg-success-soft text-success",
            )}
          >
            <Users size={11} aria-hidden />
            {complet
              ? "Complet"
              : `${tournament.slotsLeft} place${tournament.slotsLeft > 1 ? "s" : ""} sur ${tournament.slots}`}
          </span>
          {tournament.myRegistration?.status === "registered" && (
            <span className="chip mt-3 bg-blue-soft text-primary">Inscrit</span>
          )}
          {tournament.isMine && <span className="chip mt-3 bg-accent-surface text-accent">Vous organisez</span>}
        </div>
      </div>
    </Link>
  );
}

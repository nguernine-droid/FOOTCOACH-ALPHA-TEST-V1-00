"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { FFF_NOTICE_DAYS, type AnnouncementDto } from "@footcoach/shared";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";

/**
 * Une de mes annonces, avec ses propositions à valider.
 * Partagé entre la page « Annonces » et la carte du tableau de bord —
 * `showLocation` densifie l'affichage sur la page dédiée.
 */
export function MyAnnouncementCard({
  announcement: a,
  onAccept,
  onDecline,
  onCancel,
  showLocation = false,
}: {
  announcement: AnnouncementDto;
  onAccept: (announcementId: string, responseId: string) => void;
  onDecline: (announcementId: string, responseId: string) => void;
  onCancel: (announcementId: string) => void;
  showLocation?: boolean;
}) {
  const pending = a.responses.filter((r) => r.status === "pending");
  const noticeShort = a.noticeDays < FFF_NOTICE_DAYS;

  const body = (
    <div
      className={cn(
        "rounded-lg border border-line bg-white px-4 py-3 border-l-4 space-y-1.5 transition",
        a.status === "open" && "border-l-gold",
        a.status === "matched" && "border-l-success hover:bg-blue-faint",
        a.status === "cancelled" && "border-l-ink-faint opacity-70",
      )}
    >
      <p className="text-sm font-bold capitalize">
        {a.category} · {a.format} · {formatDate(a.date)} à {a.time}
      </p>

      {showLocation && (
        <p className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
          <MapPin size={12} className="text-blue shrink-0" aria-hidden />
          <span className="truncate">
            {a.stadium}, {a.city}
          </span>
        </p>
      )}

      {/* Conformité FFF : délai de déclaration et attestation du coach */}
      <div className="flex flex-wrap gap-1.5">
        {noticeShort ? (
          <span className="chip bg-coral-soft text-coral">
            <AlertTriangle size={11} /> Délai FFF non respecté ({a.noticeDays} j)
          </span>
        ) : (
          <span className="chip bg-success-soft text-success">
            <ShieldCheck size={11} /> Délai FFF respecté
          </span>
        )}
        {!a.federationDeclared && (
          <span className="chip bg-sun-soft text-sun">
            <AlertTriangle size={11} /> Déclaration non attestée
          </span>
        )}
      </div>

      {a.status === "open" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-sun flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gold animate-soft-pulse shrink-0" aria-hidden />
              {pending.length === 0
                ? "En attente de proposition"
                : `${pending.length} proposition${pending.length > 1 ? "s" : ""} à valider`}
            </p>
            <button
              onClick={() => onCancel(a.id)}
              className="p-1.5 rounded-lg text-ink-faint hover:text-coral hover:bg-coral-soft transition"
              aria-label="Annuler cette annonce"
            >
              <Trash2 size={13} />
            </button>
          </div>
          {pending.map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-paper rounded-lg px-3 py-2 mt-1.5">
              <span
                className={cn(
                  "w-7 h-7 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0",
                  teamColor(r.team),
                )}
              >
                {teamInitials(r.team.name)}
              </span>
              <span className="flex-1 min-w-0 text-xs font-bold truncate">
                {r.team.name}
                <span className="text-ink-soft font-semibold"> · {r.team.city}</span>
              </span>
              <Button size="sm" onClick={() => onAccept(a.id, r.id)}>
                Accepter
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDecline(a.id, r.id)}>
                Décliner
              </Button>
            </div>
          ))}
        </>
      )}

      {a.status === "matched" && (
        <p className="text-xs font-semibold text-success flex items-center gap-1.5">
          <CheckCircle2 size={12} className="shrink-0" />
          Match confirmé — {a.opponentTeam ? `${a.opponentTeam.name} (${a.opponentTeam.city})` : "adversaire trouvé"}
        </p>
      )}

      {a.status === "cancelled" && <p className="text-xs font-semibold text-ink-faint">Annonce annulée</p>}
    </div>
  );

  return a.status === "matched" && a.matchId ? (
    <Link href={`/coach/matches/${a.matchId}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

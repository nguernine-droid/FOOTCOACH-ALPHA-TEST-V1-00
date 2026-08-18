"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import type { MatchDto } from "@teamnexus/shared";
import { ApiError, api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

/**
 * Confirmation en deux temps, sur la feuille de match.
 *
 * Convenir d'un match six semaines à l'avance ne dit pas qu'on y sera. À
 * l'approche, chaque camp reconfirme — et ce qui compte n'est pas la
 * confirmation reçue, c'est le SILENCE d'en face, visible sept jours avant
 * plutôt qu'un coup de fil le samedi soir.
 *
 * La carte ne s'affiche qu'une fois la fenêtre ouverte : demander plus tôt
 * n'obtiendrait qu'un « oui » machinal qui ne vaudrait rien.
 */
export function ConfirmationCard({
  match,
  onConfirmed,
}: {
  match: MatchDto;
  /** Relit la feuille : la confirmation change aussi ce qui l'entoure */
  onConfirmed: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!match.confirmationOpen || match.mySide === null) return null;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api(`/matches/${match.id}/confirm`, { method: "POST" });
      await onConfirmed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Confirmation impossible");
    } finally {
      setBusy(false);
    }
  }

  const bothConfirmed = match.iConfirmed && match.opponentConfirmed;

  return (
    <section className="card p-5 space-y-3" aria-label="Confirmation du match">
      <div className="flex items-start gap-3">
        <span
          className={
            bothConfirmed
              ? "w-9 h-9 rounded-lg bg-success-soft text-success flex items-center justify-center shrink-0"
              : "w-9 h-9 rounded-lg bg-sun-soft text-sun flex items-center justify-center shrink-0"
          }
        >
          {bothConfirmed ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
        </span>
        <div className="min-w-0 space-y-1">
          <h3 className="display text-lg leading-none">
            {bothConfirmed ? "Les deux équipes ont confirmé" : "Ce match approche"}
          </h3>
          <p className="text-xs text-ink-soft">
            {bothConfirmed
              ? "Rien de plus à faire : vous vous retrouvez sur le terrain."
              : "Confirmez votre venue pour que l'adversaire sache à quoi s'en tenir."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatusTile label="Vous" confirmed={match.iConfirmed} />
        <StatusTile label="L'adversaire" confirmed={match.opponentConfirmed} />
      </div>

      {/* Le silence d'en face, dit franchement : c'est l'information pour
          laquelle cet écran existe. */}
      {match.iConfirmed && !match.opponentConfirmed && (
        <p className="text-xs font-semibold text-sun bg-sun-soft rounded-lg px-4 py-3 flex items-start gap-2">
          <ShieldAlert size={14} className="shrink-0 mt-px" aria-hidden />
          <span>
            L&apos;adversaire n&apos;a pas encore confirmé. Il a été relancé — sans réponse d&apos;ici quelques jours,
            mieux vaut chercher une solution de repli.
          </span>
        </p>
      )}

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {!match.iConfirmed && (
        <Button size="lg" className="w-full" onClick={confirm} disabled={busy}>
          <CheckCircle2 size={16} /> {busy ? "Envoi…" : "Nous serons là"}
        </Button>
      )}
    </section>
  );
}

function StatusTile({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <div className="rounded-lg bg-paper px-3 py-2.5 text-center space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">{label}</p>
      <p className={confirmed ? "text-xs font-bold text-success" : "text-xs font-bold text-ink-soft"}>
        {confirmed ? "Confirmé" : "En attente"}
      </p>
    </div>
  );
}

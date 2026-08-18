"use client";

import { useState } from "react";
import { Clock3, DoorOpen, Flag, MapPin, Pencil } from "lucide-react";
import {
  REFEREE_BY,
  REFEREE_BY_LABELS,
  type MatchDto,
  type RefereeBy,
} from "@teamnexus/shared";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { VenueLink } from "@/components/VenueLink";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";

/**
 * Les détails pratiques : heure, lieu, arbitre, vestiaires.
 *
 * Tout ce qu'on se redemande par SMS la veille, réuni sur la feuille — et
 * réglable par l'équipe qui reçoit, elle seule connaissant son stade. C'est la
 * pièce qui fait que le match se prépare ici : deux coachs qui règlent
 * l'arbitrage dans l'application y reviennent, ceux qui le règlent par texto
 * n'y reviennent pas.
 *
 * Visible des deux côtés, modifiable d'un seul : le visiteur lit, il ne
 * découvre pas un formulaire qu'il n'a pas le droit d'utiliser.
 */
export function MatchDetailsCard({ match, onChange }: { match: MatchDto; onChange: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  if (match.status === "cancelled") return null;

  const referee = match.refereeName?.trim() || REFEREE_BY_LABELS[match.refereeBy];
  const refereeUnset = match.refereeBy === "tbd" && !match.refereeName;

  return (
    <section className="card p-5 space-y-3" aria-label="Détails pratiques">
      <div className="flex items-center justify-between gap-2">
        <h3 className="display text-lg">Détails pratiques</h3>
        {match.canEditDetails && (
          <Button variant="soft" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Modifier
          </Button>
        )}
      </div>

      <dl className="space-y-2 text-sm">
        <Row icon={<Clock3 size={14} aria-hidden />} label="Coup d'envoi">
          <span className="font-bold tabular-nums">{match.time}</span>
        </Row>
        <Row icon={<MapPin size={14} aria-hidden />} label="Terrain">
          <VenueLink destination={match.location} />
        </Row>
        <Row icon={<Flag size={14} aria-hidden />} label="Arbitrage">
          <span className={cn("font-semibold", refereeUnset && "text-sun")}>{referee}</span>
        </Row>
        {match.changingRooms && (
          <Row icon={<DoorOpen size={14} aria-hidden />} label="Vestiaires">
            <span className="font-semibold">{match.changingRooms}</span>
          </Row>
        )}
      </dl>

      {/* Ce qui reste à faire, dit à celui qui peut le faire. Au visiteur, ce
          serait un reproche adressé à la mauvaise personne. */}
      {refereeUnset && match.canEditDetails && (
        <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
          L&apos;arbitrage n&apos;est pas réglé. C&apos;est la question qui se pose la veille au téléphone —
          autant y répondre maintenant.
        </p>
      )}

      {editing && (
        <DetailsSheet
          match={match}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await onChange();
          }}
        />
      )}
    </section>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="flex items-center gap-1.5 text-xs font-bold text-ink-soft w-28 shrink-0">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function DetailsSheet({
  match,
  onClose,
  onSaved,
}: {
  match: MatchDto;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [time, setTime] = useState(match.time);
  const [refereeBy, setRefereeBy] = useState<RefereeBy>(match.refereeBy);
  const [refereeName, setRefereeName] = useState(match.refereeName ?? "");
  const [changingRooms, setChangingRooms] = useState(match.changingRooms ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeChanged = time !== match.time;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/matches/${match.id}/details`, {
        method: "PATCH",
        body: JSON.stringify({ time, refereeBy, refereeName: refereeName || null, changingRooms: changingRooms || null }),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible");
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      onClose={onClose}
      label="Détails pratiques du match"
      footer={
        <Button size="lg" className="w-full" onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="details-time" className="text-xs font-bold text-ink-soft">
            Coup d&apos;envoi
          </label>
          <input
            id="details-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="field"
          />
          {/* Dit AVANT d'enregistrer, pas après : le coach doit savoir ce que
              son geste déclenche pendant qu'il peut encore y renoncer. */}
          {timeChanged && (
            <p className="text-xs font-semibold text-sun bg-sun-soft rounded-lg px-4 py-3">
              Changer l&apos;heure annule les deux confirmations. L&apos;adversaire sera prévenu et devra
              reconfirmer sa venue.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Qui arbitre ?</span>
          <div className="grid grid-cols-2 gap-2">
            {REFEREE_BY.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRefereeBy(value)}
                aria-pressed={refereeBy === value}
                className={cn(
                  "min-h-11 rounded-lg text-xs font-bold transition px-2 text-left",
                  refereeBy === value ? "bg-blue text-white" : "bg-paper text-ink-soft hover:bg-blue-faint",
                )}
              >
                {REFEREE_BY_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="details-referee" className="text-xs font-bold text-ink-soft">
            Nom de l&apos;arbitre <span className="font-semibold text-ink-faint">(facultatif)</span>
          </label>
          <input
            id="details-referee"
            maxLength={80}
            autoCapitalize="words"
            value={refereeName}
            onChange={(e) => setRefereeName(e.target.value)}
            className="field"
            placeholder="Jean D."
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="details-rooms" className="text-xs font-bold text-ink-soft">
            Vestiaires <span className="font-semibold text-ink-faint">(facultatif)</span>
          </label>
          <input
            id="details-rooms"
            maxLength={200}
            value={changingRooms}
            onChange={(e) => setChangingRooms(e.target.value)}
            className="field"
            placeholder="Vestiaires 3 et 4, à droite du club-house"
          />
        </div>

        {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

        <p className="text-[11px] text-ink-faint">
          Ces informations partent aux deux clubs dans le rappel de la veille.
        </p>
      </div>
    </BottomSheet>
  );
}

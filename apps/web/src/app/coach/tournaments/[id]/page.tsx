"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ImagePlus,
  MapPin,
  QrCode,
  ScanLine,
  Trophy,
  UserMinus,
  Users,
} from "lucide-react";
import {
  categoryLabel,
  MATCH_GENDER_LABELS,
  WITHDRAWAL_REASONS,
  WITHDRAWAL_REASON_LABELS,
  type EncounterResultDto,
  type TournamentDetailDto,
  type WithdrawalReason,
} from "@teamnexus/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { QrScanner } from "@/components/matches/QrScanner";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Retrait d'une équipe inscrite. Le motif est imposé : il part dans l'alerte
 * SOS envoyée aux jokers du secteur, qui doivent savoir pourquoi la place est
 * libre. La feuille ne fait que recueillir — c'est la page qui appelle l'API.
 */
function WithdrawSheet({
  tournamentName,
  busy,
  onClose,
  onConfirm,
}: {
  tournamentName: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: WithdrawalReason, details: string) => void;
}) {
  const [reason, setReason] = useState<WithdrawalReason | null>(null);
  const [details, setDetails] = useState("");
  return (
    <BottomSheet
      label={`Se retirer de ${tournamentName}`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="soft" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={!reason || busy}
            onClick={() => reason && onConfirm(reason, details.trim())}
          >
            {busy ? "Retrait…" : "Me retirer"}
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <p className="text-xs text-ink-soft">
          Votre place sera rendue et les coachs jokers du secteur alertés — le tournoi pourra la repourvoir à temps.
        </p>
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Motif</span>
          <div className="grid grid-cols-2 gap-2">
            {WITHDRAWAL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={cn("chip-choice", reason === r ? "chip-choice-on" : "chip-choice-off")}
              >
                {WITHDRAWAL_REASON_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-ink-soft">Précision (optionnelle)</span>
          <input
            maxLength={140}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="field"
            placeholder="Trois joueurs blessés…"
          />
          <span className="block text-[11px] text-ink-faint text-right">{details.length}/140</span>
        </label>
      </div>
    </BottomSheet>
  );
}

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tournament, setTournament] = useState<TournamentDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [checkInToken, setCheckInToken] = useState<string | null>(null);
  const [reward, setReward] = useState<EncounterResultDto | null>(null);

  const load = useCallback(async () => {
    try {
      setTournament(await api<TournamentDetailDto>(`/tournaments/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // L'organisateur tend son écran vers la file : il voit les pointages arriver
  // sans avoir à tirer pour rafraîchir.
  useEffect(() => {
    if (!checkInToken) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [checkInToken, load]);

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(`/tournaments/${id}${path}`, {
        method: "POST",
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  async function showQr() {
    setBusy(true);
    setError(null);
    try {
      const { token } = await api<{ token: string }>(`/tournaments/${id}/check-in-qr`, { method: "POST" });
      setCheckInToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'afficher le QR code");
    } finally {
      setBusy(false);
    }
  }

  const checkIn = useCallback(
    async (token: string) => {
      setScanning(false);
      setBusy(true);
      setError(null);
      try {
        const result = await api<EncounterResultDto>(`/tournaments/${id}/check-in`, {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setReward(result);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Pointage impossible");
      } finally {
        setBusy(false);
      }
    },
    [id, load],
  );

  if (error && !tournament) {
    return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  }
  if (!tournament) return <Skeleton className="h-96" />;

  const registered = tournament.registrations.filter((r) => r.status === "registered");
  const iAmIn = tournament.myRegistration?.status === "registered";
  const complet = tournament.slotsLeft === 0;
  const cancelled = tournament.status === "cancelled";
  const dates = tournament.endDate
    ? `${formatDate(tournament.date)} → ${formatDate(tournament.endDate)}`
    : formatDate(tournament.date);

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <Link
        href="/coach"
        className="inline-flex items-center gap-1.5 min-h-11 -ml-2 px-2 rounded-lg text-xs font-bold text-ink-soft
          transition hover:text-ink active:bg-paper"
      >
        <ArrowLeft size={16} /> Retour au radar
      </Link>

      <section className="card overflow-hidden" aria-label="Le tournoi">
        {tournament.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournament.posterUrl}
            alt={`Affiche du tournoi ${tournament.name}`}
            className="w-full aspect-[16/9] object-cover bg-paper"
          />
        ) : (
          <div className="w-full aspect-[16/9] flex items-center justify-center bg-structure-1 text-white/25">
            <Trophy size={48} aria-hidden />
          </div>
        )}
        <div className="p-5 space-y-3">
          <div className="space-y-1">
            <h2 className="display text-xl leading-tight">{tournament.name}</h2>
            <p className="text-xs text-ink-soft">Organisé par {tournament.team.name}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip bg-paper text-ink-soft">{categoryLabel(tournament.category)}</span>
            {tournament.gender && (
              <span className="chip bg-paper text-ink-soft">{MATCH_GENDER_LABELS[tournament.gender]}</span>
            )}
            <span className="chip bg-paper text-ink-soft">{tournament.format}</span>
            <span className={cn("chip", complet ? "bg-paper text-ink-soft" : "bg-success-soft text-success")}>
              <Users size={11} aria-hidden /> {registered.length}/{tournament.slots} équipes
            </span>
          </div>
          <div className="space-y-1 text-xs text-ink-soft">
            <p className="flex items-center gap-1.5 capitalize">
              <CalendarDays size={13} className="shrink-0" aria-hidden /> {dates} · {tournament.time}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0" aria-hidden /> {tournament.stadium}, {tournament.city}
            </p>
          </div>
          {tournament.comment && (
            <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3 whitespace-pre-line">
              {tournament.comment}
            </p>
          )}
        </div>
      </section>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {cancelled ? (
        <p className="card p-5 text-sm font-bold text-coral flex items-center gap-2">
          <AlertTriangle size={16} aria-hidden /> Ce tournoi a été annulé par son organisateur.
        </p>
      ) : (
        <>
          {tournament.isSos && !iAmIn && (
            <p className="rounded-lg bg-coral-soft px-4 py-3 text-xs font-bold text-coral flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-px" aria-hidden />
              <span>
                Une place vient de se libérer
                {tournament.sosReason ? ` (${WITHDRAWAL_REASON_LABELS[tournament.sosReason].toLowerCase()})` : ""}
                {tournament.sosDetails ? ` — ${tournament.sosDetails}` : ""}.
              </span>
            </p>
          )}

          {/* ————— Inscription ————— */}
          {!tournament.isMine && (
            <section className="card p-5 space-y-3" aria-label="Mon inscription">
              <h3 className="display text-lg">Mon équipe</h3>
              {iAmIn ? (
                <>
                  <div className="rounded-lg bg-success-soft px-4 py-3 flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-success shrink-0" aria-hidden />
                    <p className="text-xs font-bold text-success">
                      {tournament.myRegistration?.checkedInAt
                        ? "Votre équipe est pointée sur place"
                        : "Votre équipe est inscrite"}
                    </p>
                  </div>
                  {!tournament.myRegistration?.checkedInAt && (
                    <Button variant="danger" className="w-full" onClick={() => setWithdrawing(true)} disabled={busy}>
                      <UserMinus size={15} /> Me retirer du tournoi
                    </Button>
                  )}
                </>
              ) : complet ? (
                <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
                  Ce tournoi est complet. Les places se rouvrent parfois : il repassera en tête du radar si une
                  équipe se retire.
                </p>
              ) : (
                <>
                  <p className="text-xs text-ink-soft">
                    L&apos;inscription est immédiate — l&apos;organisateur n&apos;a rien à valider.
                  </p>
                  <Button size="lg" className="w-full" onClick={() => act("/register")} disabled={busy}>
                    Inscrire mon équipe
                  </Button>
                </>
              )}
            </section>
          )}

          {/* ————— Pointage à l'arrivée ————— */}
          <section className="card p-5 space-y-4" aria-label="Pointage à l'arrivée">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="display text-lg">Arrivée sur place</h3>
              {tournament.checkInOpen && <span className="chip bg-accent-surface text-accent shrink-0">Points</span>}
            </div>

            {!tournament.checkInOpen ? (
              <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
                Le jour du tournoi,{" "}
                {tournament.isMine
                  ? "vous afficherez ici un QR code que chaque équipe scannera en arrivant."
                  : "vous scannerez ici le QR code de l'organisateur pour pointer votre équipe."}
              </p>
            ) : tournament.isMine ? (
              <div className="space-y-4">
                <p className="text-xs text-ink-soft">
                  Montrez ce QR code à l&apos;accueil : chaque coach le scanne en arrivant, ce qui pointe son équipe.
                </p>
                {checkInToken ? (
                  <div className="flex flex-col items-center gap-3">
                    <QrCodeCanvas value={checkInToken} label="QR code d'arrivée du tournoi" />
                    <p className="text-xs text-ink-soft flex items-center gap-1.5">
                      <Clock3 size={13} aria-hidden /> {registered.filter((r) => r.checkedInAt).length}/
                      {registered.length} équipe(s) pointée(s)
                    </p>
                  </div>
                ) : (
                  <Button size="lg" className="w-full" onClick={showQr} disabled={busy}>
                    <QrCode size={16} /> Afficher le QR code
                  </Button>
                )}
              </div>
            ) : iAmIn && !tournament.myRegistration?.checkedInAt ? (
              <div className="space-y-4">
                <p className="text-xs text-ink-soft">
                  Scannez le QR code affiché par l&apos;organisateur à votre arrivée.
                </p>
                <Button size="lg" className="w-full" onClick={() => setScanning(true)} disabled={busy}>
                  <ScanLine size={16} /> Scanner le QR code
                </Button>
              </div>
            ) : (
              <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
                {iAmIn ? "Votre équipe est déjà pointée." : "Seules les équipes inscrites se pointent."}
              </p>
            )}

            {reward && (
              <div className="rounded-lg bg-accent-surface border border-accent/20 px-4 py-3 flex items-start gap-2.5">
                <Trophy size={15} className="text-accent shrink-0 mt-0.5" aria-hidden />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-accent">+{reward.pointsAwarded} points</p>
                  <p className="text-ink-soft">
                    Palier {reward.level.name}.
                    {reward.level.next != null
                      ? ` Encore ${reward.level.next - reward.totalPoints} points avant le suivant.`
                      : " Vous êtes au palier le plus haut."}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ————— Équipes engagées ————— */}
          <section className="card p-5 space-y-3" aria-label="Équipes engagées">
            <h3 className="display text-lg">Équipes engagées</h3>
            {tournament.registrations.length === 0 ? (
              <p className="text-xs text-ink-soft">Aucune équipe inscrite pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-2">
                {tournament.registrations.map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm",
                      r.status === "withdrawn" ? "bg-paper text-ink-faint" : "bg-paper",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className={cn(r.status === "withdrawn" && "line-through")}>{r.team.name}</span>
                      <span className="block text-xs text-ink-soft truncate">{r.team.city}</span>
                    </span>
                    {r.status === "withdrawn" ? (
                      <span className="chip bg-paper text-ink-soft shrink-0">Retirée</span>
                    ) : r.checkedInAt ? (
                      <span className="chip bg-success-soft text-success shrink-0">
                        <CheckCircle2 size={11} aria-hidden /> Présente
                      </span>
                    ) : (
                      <span className="chip bg-blue-soft text-primary shrink-0">Inscrite</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {tournament.isMine && !tournament.posterUrl && (
              <p className="text-[11px] text-ink-soft flex items-center gap-1.5">
                <ImagePlus size={12} aria-hidden /> Aucune affiche : votre tournoi se remarque moins sur le radar.
              </p>
            )}
          </section>
        </>
      )}

      {scanning && <QrScanner onResult={checkIn} onClose={() => setScanning(false)} />}

      {withdrawing && (
        <WithdrawSheet
          tournamentName={tournament.name}
          busy={busy}
          onClose={() => setWithdrawing(false)}
          onConfirm={(reason, details) => {
            setWithdrawing(false);
            act("/withdraw", { reason, ...(details ? { details } : {}) });
          }}
        />
      )}
    </div>
  );
}

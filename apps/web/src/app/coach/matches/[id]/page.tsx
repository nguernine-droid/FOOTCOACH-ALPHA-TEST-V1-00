"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Pencil,
  Play,
  QrCode,
  Radar,
  ScanLine,
  UserMinus,
} from "lucide-react";
import {
  FFF_NOTICE_DAYS,
  WITHDRAWAL_REASONS,
  WITHDRAWAL_REASON_LABELS,
  type MatchDetailDto,
  type WithdrawalReason,
} from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";
import { QrScanner } from "@/components/matches/QrScanner";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/** Saisie du score final : deux compteurs, puis émission du QR de validation */
function FinalScoreForm({
  match,
  onSubmitted,
}: {
  match: MatchDetailDto;
  onSubmitted: (message: string | null) => void;
}) {
  const [home, setHome] = useState(match.homeScore);
  const [away, setAway] = useState(match.awayScore);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/matches/${match.id}/final-score`, {
        method: "POST",
        body: JSON.stringify({ homeScore: home, awayScore: away }),
      });
      onSubmitted(null);
    } catch (err) {
      onSubmitted(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  // Mise à jour fonctionnelle : deux appuis rapprochés sont groupés par React,
  // et une valeur capturée ferait perdre un but au passage.
  // Saisie au bord du terrain, à une main : les deux boutons font 64 px et
  // sont écartés du score pour ne pas être touchés par erreur.
  const counter = (label: string, value: number, set: React.Dispatch<React.SetStateAction<number>>) => (
    <div className="space-y-2">
      <p className="text-sm font-bold text-ink-soft text-center truncate">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => set((v) => Math.max(0, v - 1))}
          className="w-16 h-16 shrink-0 rounded-xl border border-line bg-white text-2xl text-ink-soft
            transition active:scale-90 active:bg-paper hover:border-blue/40"
          aria-label={`Retirer un but à ${label}`}
        >
          −
        </button>
        {/* Largeur figée : un passage de 9 à 10 ne doit pas déplacer les boutons.
            La clé sur la valeur relance l'animation à chaque but. */}
        <span className="display text-6xl tabular-nums leading-none text-navy-700 min-w-[2ch] text-center overflow-hidden">
          <span key={value} className="animate-digit inline-block">
            {value}
          </span>
        </span>
        <button
          type="button"
          onClick={() => set((v) => Math.min(99, v + 1))}
          className="w-16 h-16 shrink-0 rounded-xl border border-blue/30 bg-blue-soft text-2xl text-navy-700
            transition active:scale-90 active:bg-blue/20 hover:border-blue/60"
          aria-label={`Ajouter un but à ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Une équipe par ligne : deux compteurs côte à côte sur un téléphone
          rendaient chaque bouton trop étroit et trop proche de son voisin. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {counter(match.homeTeam.name, home, setHome)}
        {counter(match.awayTeam.name, away, setAway)}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Enregistrement…" : "Valider le score et afficher le QR code"}
      </Button>
      <p className="text-xs text-ink-soft text-center">
        Le coach adverse devra scanner le QR code pour confirmer ce score.
      </p>
    </form>
  );
}

/**
 * Désistement avant le coup d'envoi. Le motif est imposé (il sert au message
 * envoyé aux autres coachs), la précision reste libre et facultative.
 *
 * La conséquence dépend du camp : l'équipe qui reçoit garde son terrain, donc
 * son annonce repart en SOS ; l'équipe qui se déplace, elle, ne fait qu'annuler.
 */
function WithdrawSheet({
  match,
  onClose,
  onDone,
}: {
  match: MatchDetailDto;
  onClose: () => void;
  onDone: (message: string | null) => void;
}) {
  const [reason, setReason] = useState<WithdrawalReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const reopensAnnouncement = match.mySide === "away";
  const opponent = match.mySide === "home" ? match.awayTeam : match.homeTeam;

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    try {
      await api(`/matches/${match.id}/withdraw`, {
        method: "POST",
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      onDone(null);
    } catch (err) {
      onDone(err instanceof Error ? err.message : "Désistement impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      label="Se désister de ce match"
      onClose={onClose}
      footer={
        <div className="grid gap-2">
          <Button size="lg" variant="danger" className="w-full" onClick={submit} disabled={!reason || busy}>
            {busy ? "Envoi…" : "Confirmer le désistement"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Retour
          </Button>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <div>
          <h3 className="display text-lg">Se désister</h3>
          <p className="text-xs text-ink-soft">
            Match contre {opponent.name}, le {formatDate(match.date)} à {match.time}.
          </p>
        </div>

        <div className="rounded-lg bg-coral-soft px-4 py-3 flex gap-2.5">
          <AlertTriangle size={15} className="text-coral shrink-0 mt-0.5" aria-hidden />
          <div className="text-xs text-ink-soft space-y-1">
            <p className="font-bold text-coral">Le match sera annulé et {opponent.name} prévenu.</p>
            {reopensAnnouncement ? (
              <p>
                L&apos;annonce de {opponent.name} repartira en SOS sur le radar : elle passe en tête et les coachs
                du secteur reçoivent une alerte.
              </p>
            ) : (
              <p>
                Votre annonce sera classée dans les annulées — vous ne recevrez plus de proposition dessus.
              </p>
            )}
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-2">
            Motif du désistement
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {WITHDRAWAL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                aria-pressed={reason === r}
                className={cn(
                  "chip-choice min-h-14 px-3 text-center leading-tight",
                  reason === r ? "chip-choice-on" : "chip-choice-off",
                )}
              >
                {WITHDRAWAL_REASON_LABELS[r]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Précision (facultatif)
          </span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 140))}
            rows={2}
            placeholder="Trois joueurs blessés à l'entraînement"
            className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm
              focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15"
          />
          <span className="block text-[11px] text-ink-faint text-right">{details.length}/140</span>
        </label>

        <p className="text-[11px] text-ink-soft">
          Le délai FFF de {FFF_NOTICE_DAYS} jours n&apos;est pas remis en cause : la déclaration au district porte
          sur la tenue du match, pas sur l&apos;identité de l&apos;adversaire.
        </p>
      </div>
    </BottomSheet>
  );
}

export default function CoachMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<MatchDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMatch(await api<MatchDetailDto>(`/matches/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Le coach en attente de validation rafraîchit pour voir la confirmation arriver
  useEffect(() => {
    if (match?.status !== "awaiting_confirmation" || !match.confirmationToken) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [match?.status, match?.confirmationToken, load]);

  async function kickoff() {
    setBusy(true);
    setError(null);
    try {
      await api(`/matches/${id}/kickoff`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de démarrer le match");
    } finally {
      setBusy(false);
    }
  }

  const confirmWithToken = useCallback(
    async (token: string) => {
      setScanning(false);
      setBusy(true);
      setError(null);
      try {
        await api(`/matches/${id}/confirm-score`, { method: "POST", body: JSON.stringify({ token }) });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Validation impossible");
      } finally {
        setBusy(false);
      }
    },
    [id, load],
  );

  if (error && !match) {
    return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  }
  if (!match) return <Skeleton className="h-96" />;

  const iSubmitted = match.confirmationToken != null;
  const awaiting = match.status === "awaiting_confirmation";
  const cancelled = match.status === "cancelled";
  const iWithdrew =
    match.withdrawnByTeamId !== null &&
    match.withdrawnByTeamId === (match.mySide === "home" ? match.homeTeam.id : match.awayTeam.id);
  // Seule l'équipe qui reçoit garde son terrain : c'est son annonce qui repart
  const announcementReopened = cancelled && match.withdrawnByTeamId === match.awayTeam.id;

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <Link
        href="/coach/matches"
        className="inline-flex items-center gap-1.5 min-h-11 -ml-2 px-2 rounded-lg text-xs font-bold text-ink-soft
          transition hover:text-ink active:bg-white"
      >
        <ArrowLeft size={16} /> Retour aux matchs
      </Link>

      <MatchCard match={match} />

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {cancelled ? (
        <section className="card p-5 space-y-4" aria-label="Match annulé">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-coral-soft text-coral flex items-center justify-center shrink-0">
              <UserMinus size={18} />
            </span>
            <div className="min-w-0 space-y-1">
              <h3 className="display text-lg leading-none">
                {iWithdrew ? "Vous vous êtes désisté" : "L'adversaire s'est désisté"}
              </h3>
              <p className="text-xs text-ink-soft">
                {match.withdrawalReason
                  ? WITHDRAWAL_REASON_LABELS[match.withdrawalReason]
                  : "Motif non précisé"}
                {match.withdrawalDetails && ` — ${match.withdrawalDetails}`}
              </p>
            </div>
          </div>

          {announcementReopened ? (
            <div className="rounded-lg bg-paper px-4 py-3 space-y-3">
              <p className="text-xs text-ink-soft">
                {match.mySide === "home"
                  ? "Votre annonce est repartie en SOS sur le radar : elle passe en tête et les coachs du secteur ont été alertés. Votre déclaration à la fédération reste valable."
                  : "L'annonce est repartie en SOS sur le radar — une autre équipe peut reprendre ce match."}
              </p>
              <ButtonLink
                href={match.mySide === "home" ? "/coach/announcements" : "/coach"}
                variant="soft"
                className="w-full sm:w-auto"
              >
                <Radar size={14} /> {match.mySide === "home" ? "Voir mon annonce" : "Ouvrir le radar"}
              </ButtonLink>
            </div>
          ) : (
            <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
              L&apos;annonce à l&apos;origine de ce match a été annulée : plus aucune proposition n&apos;y est
              possible.
            </p>
          )}
        </section>
      ) : (
        <>
        {/* ————— Score final et sa validation ————— */}
        <section className="card p-5 space-y-4" aria-label="Score final">
          <h3 className="display text-lg">Score final</h3>

          {match.status === "finished" ? (
            <div className="rounded-lg bg-success-soft px-4 py-4 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-success shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-success">Score validé par les deux coachs</p>
                <p className="text-xs text-ink-soft">
                  {match.homeTeam.name} {match.homeScore} – {match.awayScore} {match.awayTeam.name}
                </p>
              </div>
            </div>
          ) : awaiting && iSubmitted ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-sun-soft px-4 py-3 flex items-center gap-2.5">
                <Clock3 size={16} className="text-sun shrink-0" />
                <p className="text-xs font-bold text-sun">
                  En attente de validation par {match.mySide === "home" ? match.awayTeam.name : match.homeTeam.name}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="display text-5xl tabular-nums text-navy-700">
                  {match.homeScore}
                  <span className="text-ink-faint mx-2">–</span>
                  {match.awayScore}
                </p>
                <QrCodeCanvas value={match.confirmationToken!} label="QR code de validation du score" />
                <p className="text-xs text-ink-soft text-center max-w-xs">
                  Montrez ce QR code au coach adverse : il le scanne depuis son compte pour valider le score.
                </p>
              </div>
              {/* Un <details> laissait un « summary » de 16 px de haut comme seule
                  cible : remplacé par un bouton pleine largeur. */}
              {correcting ? (
                <div className="border-t border-line pt-4 space-y-2">
                  <FinalScoreForm
                    match={match}
                    onSubmitted={(message) => {
                      setError(message);
                      setCorrecting(false);
                      load();
                    }}
                  />
                  <p className="text-[11px] text-ink-soft text-center">
                    Une correction génère un nouveau QR code : l&apos;ancien cesse de fonctionner.
                  </p>
                  <Button variant="ghost" className="w-full" onClick={() => setCorrecting(false)}>
                    Annuler la correction
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" className="w-full" onClick={() => setCorrecting(true)}>
                  <Pencil size={14} /> Corriger le score
                </Button>
              )}
            </div>
          ) : awaiting ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-sun-soft px-4 py-3 flex items-start gap-2.5">
                <QrCode size={16} className="text-sun shrink-0 mt-0.5" />
                <p className="text-xs text-ink-soft">
                  <span className="font-bold text-sun">
                    {match.mySide === "home" ? match.awayTeam.name : match.homeTeam.name} a saisi le score.
                  </span>{" "}
                  Scannez le QR code affiché sur son écran pour le valider.
                </p>
              </div>
              <p className="display text-5xl tabular-nums text-navy-700 text-center">
                {match.homeScore}
                <span className="text-ink-faint mx-2">–</span>
                {match.awayScore}
              </p>
              <Button size="lg" className="w-full" onClick={() => setScanning(true)} disabled={busy}>
                <ScanLine size={16} /> Scanner le QR code
              </Button>
            </div>
          ) : match.finalScoreDue ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-coral-soft px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-coral shrink-0 mt-0.5" />
                <p className="text-xs text-ink-soft">
                  <span className="font-bold text-coral">Le match a eu lieu.</span> Saisissez le score final : il devra
                  être validé par le coach adverse.
                </p>
              </div>
              <FinalScoreForm
                match={match}
                onSubmitted={(message) => {
                  setError(message);
                  load();
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-soft">
                Le score final se saisit à la fin de la rencontre, puis se valide avec le coach adverse.
              </p>
              {match.status === "scheduled" && (
                <Button variant="soft" size="lg" className="w-full" onClick={kickoff} disabled={busy}>
                  <Play size={16} /> Donner le coup d&apos;envoi
                </Button>
              )}
            </div>
          )}
        </section>

          {/* Se désister : une sortie de parcours, tenue à distance des actions
              du match et jamais présentée comme un bouton anodin. */}
          {match.status === "scheduled" && (
            <section className="card p-5 space-y-3" aria-label="Désistement">
              <div>
                <h3 className="display text-lg leading-none">Un empêchement ?</h3>
                <p className="text-xs text-ink-soft mt-1.5">
                  {match.mySide === "away"
                    ? "Prévenez tout de suite : l'annonce repartira en SOS sur le radar et le coach pourra retrouver une équipe à temps."
                    : "Prévenez tout de suite : le match sera annulé et votre adversaire alerté."}
                </p>
              </div>
              <Button variant="danger" size="lg" className="w-full" onClick={() => setWithdrawing(true)}>
                <UserMinus size={16} /> Se désister du match
              </Button>
            </section>
          )}
        </>
      )}

      {scanning && <QrScanner onResult={confirmWithToken} onClose={() => setScanning(false)} />}

      {withdrawing && (
        <WithdrawSheet
          match={match}
          onClose={() => setWithdrawing(false)}
          onDone={(message) => {
            setWithdrawing(false);
            setError(message);
            load();
          }}
        />
      )}
    </div>
  );
}

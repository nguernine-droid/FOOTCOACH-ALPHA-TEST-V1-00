"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Pencil,
  Play,
  QrCode,
  Radar,
  ScanLine,
  Trophy,
  UserMinus,
} from "lucide-react";
import {
  FFF_NOTICE_DAYS,
  POINTS_COOLDOWN_DAYS,
  WITHDRAWAL_REASONS,
  WITHDRAWAL_REASON_LABELS,
  type EncounterResultDto,
  type MatchDetailDto,
  type WithdrawalReason,
} from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { MatchCard } from "@/components/MatchCard";
import { CoachCardSheet } from "@/components/coach/CoachCardSheet";
import { QrScanner } from "@/components/matches/QrScanner";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/** Saisie du score final : deux compteurs, et le match est clos */
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
          className="w-16 h-16 shrink-0 rounded-xl border border-line surface text-2xl text-ink-soft
            transition active:scale-90 active:bg-paper hover:border-blue/40"
          aria-label={`Retirer un but à ${label}`}
        >
          −
        </button>
        {/* Largeur figée : un passage de 9 à 10 ne doit pas déplacer les boutons.
            La clé sur la valeur relance l'animation à chaque but. */}
        <span className="display text-6xl tabular-nums leading-none text-primary min-w-[2ch] text-center overflow-hidden">
          <span key={value} className="animate-digit inline-block">
            {value}
          </span>
        </span>
        <button
          type="button"
          onClick={() => set((v) => Math.min(99, v + 1))}
          className="w-16 h-16 shrink-0 rounded-xl border border-blue/30 bg-blue-soft text-2xl text-primary
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
        {busy ? "Enregistrement…" : "Enregistrer le score final"}
      </Button>
      <p className="text-xs text-ink-soft text-center">
        Le coach adverse en est averti et peut le corriger si vous vous êtes trompé.
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
            className="w-full rounded-lg border border-line surface px-4 py-3 text-sm
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

/**
 * Ce que le scan vient de rapporter. Affiché au seul coach qui a scanné, juste
 * après son geste : c'est le moment où la récompense a un sens.
 *
 * Le plafond est annoncé en toutes lettres. Un « 0 point » sans explication
 * passerait pour une panne, alors que la rencontre est bien validée.
 */
function EncounterReward({ result }: { result: EncounterResultDto }) {
  if (result.cappedByCooldown) {
    return (
      <div className="rounded-lg bg-paper px-4 py-3 flex items-start gap-2.5">
        <Trophy size={15} className="text-ink-soft shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-ink-soft">
          <span className="font-bold text-ink">Pas de points cette fois.</span> Vous avez déjà rencontré cette équipe
          au cours des {POINTS_COOLDOWN_DAYS} derniers jours — les points reviennent au-delà, avec elle comme avec
          les autres.
        </p>
      </div>
    );
  }
  const progress =
    result.level.next != null
      ? `Encore ${result.level.next - result.totalPoints} points avant le palier suivant.`
      : "Vous êtes au palier le plus haut.";
  return (
    <div className="rounded-lg bg-accent-surface border border-accent/20 px-4 py-3 flex items-start gap-2.5">
      <Trophy size={15} className="text-accent shrink-0 mt-0.5" aria-hidden />
      <div className="text-xs space-y-0.5">
        <p className="font-bold text-accent">
          +{result.pointsAwarded} points
          {result.reason === "sos" && " — dépannage SOS"}
        </p>
        <p className="text-ink-soft">
          Palier {result.level.name}. {progress}
        </p>
      </div>
    </div>
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
  // Jeton du QR de rencontre, obtenu à la demande par le coach qui reçoit. Hors
  // du DTO à dessein : il ne doit sortir que quand on demande à l'afficher.
  const [encounterToken, setEncounterToken] = useState<string | null>(null);
  const [encounterResult, setEncounterResult] = useState<EncounterResultDto | null>(null);
  /** Coach dont on regarde la carte, null quand la feuille est fermée */
  const [cardOf, setCardOf] = useState<string | null>(null);

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

  // Le coach qui montre son QR voit la validation arriver sans rien toucher :
  // il a le téléphone tendu vers l'autre, il ne peut pas tirer pour rafraîchir.
  useEffect(() => {
    if (!encounterToken || match?.encounterConfirmedAt) return;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [encounterToken, match?.encounterConfirmedAt, load]);

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

  /** Coach qui reçoit : demande son QR (l'appel retient que c'est lui qui l'affiche) */
  async function showEncounterQr() {
    setBusy(true);
    setError(null);
    try {
      const { token } = await api<{ token: string }>(`/matches/${id}/encounter-qr`, { method: "POST" });
      setEncounterToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'afficher le QR code");
    } finally {
      setBusy(false);
    }
  }

  /** Coach qui s'est déplacé : le scan valide la rencontre et crédite les points */
  const confirmEncounter = useCallback(
    async (token: string) => {
      setScanning(false);
      setBusy(true);
      setError(null);
      try {
        const result = await api<EncounterResultDto>(`/matches/${id}/confirm-encounter`, {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setEncounterResult(result);
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

  const cancelled = match.status === "cancelled";
  const encounterDone = match.encounterConfirmedAt != null;
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
          transition hover:text-ink active:bg-paper"
      >
        <ArrowLeft size={16} /> Retour aux matchs
      </Link>

      <MatchCard match={match} />

      {/* ————— Les deux coachs —————
          Placés juste sous la feuille : avant de se déplacer, on veut savoir
          qui l'on va trouver en face — et c'est la première chose qu'on
          cherche quand on rouvre un match passé. */}
      {(match.homeCoach || match.awayCoach) && (
        <section className="card p-5 space-y-3" aria-label="Les coachs">
          <h3 className="display text-lg">Les coachs</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { coach: match.homeCoach, team: match.homeTeam, side: "Reçoit" },
              { coach: match.awayCoach, team: match.awayTeam, side: "Se déplace" },
            ].map(({ coach, team, side }) =>
              coach ? (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setCardOf(coach.id)}
                  className="flex items-center gap-3 rounded-lg bg-paper px-4 py-3 text-left transition
                    hover:bg-blue-faint active:bg-blue-soft"
                >
                  <Avatar firstName={coach.firstName} lastName={coach.lastName} avatarUrl={coach.avatarUrl} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold truncate">
                      {coach.firstName} {coach.lastName}
                    </span>
                    <span className="block text-xs text-ink-soft truncate">
                      {side} · {team.name}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
                </button>
              ) : (
                <p key={team.id} className="rounded-lg bg-paper px-4 py-3 text-xs text-ink-soft">
                  {team.name} — aucun coach déclaré
                </p>
              ),
            )}
          </div>
        </section>
      )}

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
          {/* Se désister : rattaché à la feuille de match, juste sous elle, et
              non relégué sous la carte du score — c'est là qu'on le cherche.
              Une ligne discrète : l'action reste rare et lourde de conséquences. */}
          {match.status === "scheduled" && (
            <div className="card px-5 py-4 flex flex-wrap items-center gap-3" aria-label="Désistement">
              <p className="text-xs text-ink-soft min-w-[13rem] flex-1">
                <span className="font-bold text-ink">Un empêchement ?</span>{" "}
                {match.mySide === "away"
                  ? "L'annonce repartira en SOS sur le radar : le coach pourra retrouver une équipe à temps."
                  : "Le match sera annulé et votre adversaire prévenu."}
              </p>
              <Button
                variant="danger"
                onClick={() => setWithdrawing(true)}
                className="w-full sm:w-auto shrink-0"
              >
                <UserMinus size={15} /> Se désister
              </Button>
            </div>
          )}

        {/* ————— Rencontre : le face-à-face au stade —————
            Placée AVANT le score : c'est ce qui se passe en premier dans la
            journée, et c'est elle qui atteste que le match a eu lieu. */}
        <section className="card p-5 space-y-4" aria-label="Validation de la rencontre">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="display text-lg">Rencontre</h3>
            {!encounterDone && match.encounterOpen && (
              <span className="chip bg-accent-surface text-accent shrink-0">
                <Trophy size={11} /> {match.mySide === "away" ? "Jusqu'à 20 points" : "10 points"}
              </span>
            )}
          </div>

          {encounterDone ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-success-soft px-4 py-4 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-success shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-success">Rencontre validée par les deux coachs</p>
                  <p className="text-xs text-ink-soft">
                    Les deux équipes se sont bien retrouvées au stade.
                  </p>
                </div>
              </div>
              {/* Le résultat n'existe que dans la session du coach qui vient de
                  scanner : c'est à lui, et à ce moment-là, que les points parlent. */}
              {encounterResult && <EncounterReward result={encounterResult} />}
            </div>
          ) : !match.encounterOpen ? (
            <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
              Le jour du match, {match.mySide === "home" ? "vous afficherez ici un QR code" : "vous scannerez ici le QR code"}{" "}
              {match.mySide === "home"
                ? "que le coach adverse scannera à son arrivée."
                : "affiché par le coach qui vous reçoit."}{" "}
              C&apos;est ce qui atteste que la rencontre a bien eu lieu.
            </p>
          ) : match.mySide === "home" ? (
            <div className="space-y-4">
              <p className="text-xs text-ink-soft">
                Vous recevez : montrez ce QR code au coach adverse quand il arrive. C&apos;est lui qui le scanne.
              </p>
              {encounterToken ? (
                <div className="flex flex-col items-center gap-3">
                  <QrCodeCanvas value={encounterToken} label="QR code de validation de la rencontre" />
                  <p className="text-xs text-ink-soft text-center max-w-xs flex items-center gap-1.5">
                    <Clock3 size={13} className="shrink-0" /> En attente de son scan…
                  </p>
                </div>
              ) : (
                <Button size="lg" className="w-full" onClick={showEncounterQr} disabled={busy}>
                  <QrCode size={16} /> Afficher le QR code
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-ink-soft">
                Vous vous déplacez : scannez le QR code affiché par le coach qui vous reçoit. Impossible à distance —
                c&apos;est ce qui donne sa valeur à l&apos;attestation.
              </p>
              <Button size="lg" className="w-full" onClick={() => setScanning(true)} disabled={busy}>
                <ScanLine size={16} /> Scanner le QR code
              </Button>
            </div>
          )}
        </section>

        {/* ————— Score final ————— */}
        <section className="card p-5 space-y-4" aria-label="Score final">
          <h3 className="display text-lg">Score final</h3>

          {match.status === "finished" && !correcting ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-success-soft px-4 py-4 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-success shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-success">Score enregistré</p>
                  <p className="text-xs text-ink-soft">
                    {match.homeTeam.name} {match.homeScore} – {match.awayScore} {match.awayTeam.name}
                  </p>
                </div>
              </div>
              {/* Corrigeable par l'un comme par l'autre : sans contre-signature,
                  une erreur de saisie n'a plus de raison d'être définitive. */}
              <Button variant="ghost" className="w-full" onClick={() => setCorrecting(true)}>
                <Pencil size={14} /> Corriger le score
              </Button>
            </div>
          ) : correcting ? (
            <div className="space-y-2">
              <FinalScoreForm
                match={match}
                onSubmitted={(message) => {
                  setError(message);
                  setCorrecting(false);
                  load();
                }}
              />
              <Button variant="ghost" className="w-full" onClick={() => setCorrecting(false)}>
                Annuler la correction
              </Button>
            </div>
          ) : match.finalScoreDue ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-coral-soft px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-coral shrink-0 mt-0.5" />
                <p className="text-xs text-ink-soft">
                  <span className="font-bold text-coral">Le match a eu lieu.</span> Saisissez le score final —
                  l&apos;un ou l&apos;autre coach peut le faire.
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
              <p className="text-xs text-ink-soft">Le score final se saisit à la fin de la rencontre.</p>
              {match.status === "scheduled" && (
                <Button variant="soft" size="lg" className="w-full" onClick={kickoff} disabled={busy}>
                  <Play size={16} /> Donner le coup d&apos;envoi
                </Button>
              )}
            </div>
          )}
        </section>

        </>
      )}

      {scanning && <QrScanner onResult={confirmEncounter} onClose={() => setScanning(false)} />}
      {cardOf && <CoachCardSheet coachId={cardOf} onClose={() => setCardOf(null)} />}

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

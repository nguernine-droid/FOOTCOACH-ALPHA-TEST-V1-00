"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Pencil, Play, QrCode, ScanLine } from "lucide-react";
import type { MatchDetailDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MatchCard } from "@/components/MatchCard";
import { QrScanner } from "@/components/matches/QrScanner";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { Button } from "@/components/ui/Button";
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

export default function CoachMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<MatchDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [correcting, setCorrecting] = useState(false);
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

      {scanning && <QrScanner onResult={confirmWithToken} onClose={() => setScanning(false)} />}
    </div>
  );
}

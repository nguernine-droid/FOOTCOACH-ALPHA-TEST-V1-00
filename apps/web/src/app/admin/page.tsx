"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Shield, TriangleAlert, UserCheck, Users, X } from "lucide-react";
import { RESET_CONFIRMATION, type AdminResetResultDto, type AdminStatsDto, type Role } from "@teamnexus/shared";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { BarChart } from "@/components/admin/BarChart";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { Skeleton } from "@/components/ui/Skeleton";

const ROLE_LABELS: Record<Role, string> = {
  coach: "Coachs",
  player: "Joueurs",
  parent: "Parents",
  supporter: "Supporters",
  admin: "Admins",
  club: "Clubs",
};

const DAY_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">{label}</p>
      <p className="display text-3xl text-primary tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-ink-soft font-semibold">{hint}</p>}
    </div>
  );
}

/**
 * Remise à zéro de la base — le geste de l'ouverture réelle.
 *
 * La feuille dit d'abord ce qui va disparaître, chiffres à l'appui, et n'arme
 * son bouton qu'une fois la phrase retapée à l'identique. Ni case à cocher ni
 * second « êtes-vous sûr ? » : seule une saisie exacte ne se franchit pas d'un
 * geste réflexe, et cette opération-là ne se répare qu'avec une sauvegarde.
 */
function ResetSheet({ stats, onClose, onDone }: { stats: AdminStatsDto; onClose: () => void; onDone: () => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminResetResultDto | null>(null);
  const armed = typed.trim().toUpperCase() === RESET_CONFIRMATION;
  const nonAdmins = stats.totalAccounts - stats.byRole.admin;

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      setResult(
        await api<AdminResetResultDto>("/admin/reset", {
          method: "POST",
          body: JSON.stringify({ confirm: RESET_CONFIRMATION }),
        }),
      );
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Remise à zéro impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      label="Remise à zéro de la base"
      onClose={onClose}
      footer={
        result ? (
          <Button className="w-full" onClick={onClose}>
            Fermer
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" variant="danger" disabled={!armed || busy} onClick={reset}>
              <TriangleAlert size={14} /> Tout effacer
            </Button>
          </div>
        )
      }
    >
      <div className="p-5 pt-2 space-y-4">
        {result ? (
          <>
            <div className="space-y-1">
              <h3 className="text-base font-black">Base remise à zéro</h3>
              <p className="text-sm text-ink-soft">
                L&apos;application est vierge. Votre compte administrateur et votre session sont intacts.
              </p>
            </div>
            <ul className="text-xs bg-paper rounded-lg px-4 py-3 space-y-1">
              {(
                [
                  ["Comptes", result.accounts],
                  ["Équipes", result.teams],
                  ["Clubs", result.clubs],
                  ["Annonces", result.announcements],
                  ["Matchs", result.matches],
                  ["Tournois", result.tournaments],
                  ["Messages", result.messages],
                  ["Fichiers envoyés", result.files],
                ] as const
              ).map(([label, value]) => (
                <li key={label} className="flex items-center justify-between gap-3">
                  <span className="text-ink-soft font-semibold">{label}</span>
                  <span className="font-black tabular-nums">{value}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <h3 className="text-base font-black">Effacer toutes les données</h3>
              <p className="text-sm text-ink-soft">
                Pour ouvrir l&apos;application pour de vrai, sur une base vierge. Cette opération est
                <span className="font-bold"> définitive</span> : seule une sauvegarde de la base permet de revenir
                en arrière.
              </p>
            </div>

            <ul className="text-xs bg-coral-soft text-coral rounded-lg px-4 py-3 space-y-1 font-semibold">
              <li>{nonAdmins} compte{nonAdmins > 1 ? "s" : ""} (coachs, clubs, joueurs…) — les admins restent</li>
              <li>{stats.teamsCount} équipe{stats.teamsCount > 1 ? "s" : ""} et leurs clubs</li>
              <li>
                {stats.matchesTotal} match{stats.matchesTotal > 1 ? "s" : ""} et {stats.tournamentsTotal} tournoi
                {stats.tournamentsTotal > 1 ? "s" : ""}
              </li>
              <li>Annonces, relations, messages, publications, points</li>
              <li>Photos de profil et écussons envoyés</li>
            </ul>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft" htmlFor="reset-confirm">
                Tapez {RESET_CONFIRMATION} pour confirmer
              </label>
              <input
                id="reset-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="field font-mono tracking-widest"
                placeholder={RESET_CONFIRMATION}
              />
            </div>
            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
          </>
        )}
      </div>
    </BottomSheet>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hourlyDate, setHourlyDate] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async (date?: string) => {
    try {
      setStats(await api<AdminStatsDto>(`/admin/stats${date ? `?date=${date}` : ""}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load(hourlyDate || undefined);
  }, [load, hourlyDate]);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!stats) {
    return (
      <div className="space-y-4" aria-busy aria-label="Chargement">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const perDay = stats.loginsPerDay.map((d) => {
    const date = new Date(`${d.date}T12:00:00`);
    return {
      key: d.date,
      label: `${DAY_SHORT[date.getDay()]}${date.getDate()}`,
      fullLabel: formatDate(d.date),
      value: d.count,
    };
  });
  const perHour = stats.loginsPerHour.map((h) => ({
    key: String(h.hour),
    label: h.hour % 3 === 0 ? `${h.hour}h` : "",
    fullLabel: `${stats.hourlyDate === todayIso() ? "Aujourd'hui" : formatDate(stats.hourlyDate)} ${h.hour}h – ${h.hour + 1}h`,
    value: h.count,
  }));

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Shield size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Vue d&apos;ensemble</h2>
          <p className="text-xs text-white/80">Activité globale de la plateforme.</p>
        </div>
      </div>

      {/* Tuiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Comptes" value={stats.totalAccounts} hint={`${stats.teamsCount} équipe${stats.teamsCount > 1 ? "s" : ""}`} />
        <StatTile label="Actifs 7 jours" value={stats.active7d} hint="comptes connectés" />
        <StatTile label="Actifs 30 jours" value={stats.active30d} hint="comptes connectés" />
        <Link href="/admin/comptes" className="card p-4 hover:border-blue/40 transition">
          <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase flex items-center gap-1">
            <KeyRound size={11} /> Resets demandés
          </p>
          <p className="display text-3xl text-primary tabular-nums leading-tight">{stats.pendingResets}</p>
          <p className="text-[11px] text-blue font-semibold">Gérer les comptes</p>
        </Link>
        <StatTile
          label="Matchs"
          value={stats.matchesTotal}
          hint={`${stats.matchesPlayed} joué${stats.matchesPlayed > 1 ? "s" : ""}`}
        />
        <StatTile
          label="Tournois"
          value={stats.tournamentsTotal}
          hint={`${stats.tournamentsPlayed} joué${stats.tournamentsPlayed > 1 ? "s" : ""}`}
        />
      </div>

      {/* Répartition par rôle */}
      <section className="card p-5 space-y-3" aria-label="Comptes par rôle">
        <h3 className="text-sm font-black">Comptes par rôle</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(stats.byRole) as [Role, number][]).map(([role, n]) => (
            <span key={role} className="chip bg-paper text-ink-soft">
              {role === "coach" && <UserCheck size={12} />}
              {role !== "coach" && <Users size={12} />}
              {ROLE_LABELS[role]} · <span className="tabular-nums font-black text-ink">{n}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Connexions par jour */}
      <section className="card p-5 space-y-3" aria-label="Connexions par jour">
        <h3 className="text-sm font-black">Connexions — 14 derniers jours</h3>
        <BarChart data={perDay} ariaLabel="Nombre de connexions par jour sur les 14 derniers jours" />
      </section>

      {/* Connexions par heure d'un jour choisi */}
      <section className="card p-5 space-y-3" aria-label="Connexions par heure">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black">Connexions heure par heure</h3>
          <div className="flex items-center gap-1.5 min-w-44">
            <div className="flex-1">
              <DateField value={hourlyDate} onChange={setHourlyDate} placeholder="Aujourd'hui" />
            </div>
            {hourlyDate && (
              <button
                type="button"
                onClick={() => setHourlyDate("")}
                className="p-2 rounded-lg text-ink-soft hover:text-coral hover:bg-coral-soft transition"
                aria-label="Revenir à aujourd'hui"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <BarChart data={perHour} ariaLabel={`Connexions heure par heure le ${stats.hourlyDate}`} />
      </section>

      {/* Zone de danger, tout en bas et à part : rien de ce qui précède ne se
          répare avec une sauvegarde, elle si — elle ne doit jamais se trouver
          sous le pouce au milieu d'une consultation de statistiques. */}
      <section className="card p-5 space-y-3 border-coral/30" aria-label="Zone de danger">
        <div className="flex items-center gap-2">
          <TriangleAlert size={16} className="text-coral shrink-0" />
          <h3 className="text-sm font-black">Zone de danger</h3>
        </div>
        <p className="text-xs text-ink-soft">
          Effacer toutes les données de l&apos;alpha pour ouvrir l&apos;application sur une base vierge. Les comptes
          administrateurs sont conservés. Prenez une sauvegarde de la base avant.
        </p>
        <Button variant="danger" size="sm" onClick={() => setResetting(true)}>
          <TriangleAlert size={13} /> Remettre la base à zéro
        </Button>
      </section>

      {resetting && (
        <ResetSheet stats={stats} onClose={() => setResetting(false)} onDone={() => load(hourlyDate || undefined)} />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Shield, UserCheck, Users, X } from "lucide-react";
import type { AdminStatsDto, Role } from "@footcoach/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { BarChart } from "@/components/admin/BarChart";
import { DateField } from "@/components/ui/DateField";
import { Skeleton } from "@/components/ui/Skeleton";

const ROLE_LABELS: Record<Role, string> = {
  coach: "Coachs",
  player: "Joueurs",
  parent: "Parents",
  supporter: "Supporters",
  admin: "Admins",
};

const DAY_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">{label}</p>
      <p className="display text-3xl text-navy-700 tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-ink-soft font-semibold">{hint}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hourlyDate, setHourlyDate] = useState("");

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
          <p className="display text-3xl text-navy-700 tabular-nums leading-tight">{stats.pendingResets}</p>
          <p className="text-[11px] text-blue font-semibold">Gérer les comptes</p>
        </Link>
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
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";
import type { ClubOverviewDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">{label}</p>
      <p className="display text-3xl text-primary tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-ink-soft font-semibold">{hint}</p>}
    </div>
  );
}

export default function ClubDashboardPage() {
  const [overview, setOverview] = useState<ClubOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await api<ClubOverviewDto>("/club/overview"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!overview) {
    return (
      <div className="space-y-4" aria-busy aria-label="Chargement">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { club } = overview;

  return (
    <div className="space-y-5">
      <div className="hero-pitch p-6 space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Espace club</p>
        <h2 className="display text-2xl">{club.name}</h2>
        <p className="text-sm text-white/80">{club.city}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Équipes" value={overview.teamsCount} />
        <StatTile label="Coachs" value={overview.coachesCount} />
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className="display text-lg">Équipes</h3>
        <Link href="/club/equipes" className="text-xs font-bold text-blue hover:underline">
          Gérer les équipes
        </Link>
      </div>

      {overview.teams.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Users size={22} />
          </span>
          <p className="text-sm text-ink-soft font-medium">Aucune équipe pour l&apos;instant.</p>
          <p className="text-xs text-ink-soft">
            Créez vos équipes (U11, U13, U15…) depuis l&apos;onglet <span className="font-bold">Équipes</span>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 items-start">
          {overview.teams.map((team) => (
            <div key={team.id} className="card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center shrink-0">
                  <Users size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{team.name}</p>
                  <p className="text-xs text-ink-soft truncate">{team.city}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {team.coaches.length === 0 ? (
                  <span className="chip bg-sun-soft text-sun">
                    <ShieldCheck size={11} /> Aucun coach affecté
                  </span>
                ) : (
                  team.coaches.map((c) => (
                    <span key={c.id} className="chip bg-pitch-soft text-primary">
                      <ShieldCheck size={11} /> {c.firstName} {c.lastName}
                      {c.role === "adjoint" ? " (adjoint)" : ""}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

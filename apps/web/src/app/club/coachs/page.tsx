"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import type { ClubCoachDto, ClubOverviewDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

function AffiliationCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
          <ShieldCheck size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Code d&apos;affiliation</p>
          <p className="text-xs text-ink-soft">
            Communiquez ce code à un coach déjà inscrit pour le rattacher à votre club.
          </p>
        </div>
      </div>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={cn(
          "inline-flex items-center gap-2 font-mono font-black text-lg tracking-[0.25em] rounded-lg px-4 py-2 border transition",
          copied ? "bg-success-soft text-success border-success/30" : "bg-white border-line hover:border-blue/50",
        )}
        aria-label={`Copier le code ${code}`}
      >
        {code}
        {copied ? <Check size={15} className="text-success" /> : <Copy size={15} className="text-ink-soft" />}
      </button>
    </div>
  );
}

export default function ClubCoachesPage() {
  const [overview, setOverview] = useState<ClubOverviewDto | null>(null);
  const [coaches, setCoaches] = useState<ClubCoachDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ov, list] = await Promise.all([
        api<ClubOverviewDto>("/club/overview"),
        api<ClubCoachDto[]>("/club/coaches"),
      ]);
      setOverview(ov);
      setCoaches(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!overview || !coaches) return <CardGridSkeleton cards={2} />;

  return (
    <div className="space-y-4">
      <AffiliationCodeCard code={overview.club.affiliationCode} />

      <h2 className="display text-lg px-1">Coachs ({coaches.length})</h2>

      {coaches.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <span className="w-12 h-12 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center mx-auto">
            <ShieldCheck size={22} />
          </span>
          <p className="text-sm text-ink-soft font-medium">Aucun coach affilié pour l&apos;instant.</p>
          <p className="text-xs text-ink-soft">
            Partagez le code d&apos;affiliation ci-dessus, ou créez un compte coach (bientôt disponible).
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 items-start">
          {coaches.map((coach) => (
            <div key={coach.id} className="card p-5 space-y-3 animate-rise-in">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-navy-700 text-white flex items-center justify-center text-sm font-black shrink-0">
                  {coach.firstName[0]}
                  {coach.lastName[0] ?? ""}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">
                    {coach.firstName} {coach.lastName}
                  </p>
                  <p className="text-xs text-ink-soft truncate">{coach.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {coach.teams.length === 0 ? (
                  <span className="chip bg-paper text-ink-soft">Aucune équipe affectée</span>
                ) : (
                  coach.teams.map((t) => (
                    <span key={t.id} className="chip bg-pitch-soft text-pitch-deep">
                      {t.name}
                      {t.role === "adjoint" ? " (adjoint)" : ""}
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

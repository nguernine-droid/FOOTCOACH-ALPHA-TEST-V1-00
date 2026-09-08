"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Compass,
  Filter,
  Layers,
  TrendingUp,
} from "lucide-react";
import { insightRate, type AdminInsightsDto, type BreakdownDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BarChart } from "@/components/admin/BarChart";
import { Funnel } from "@/components/admin/Funnel";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * ————— L'analyse, sous la vue d'ensemble —————
 *
 * Les tuiles du dessus répondent à « combien ». Ce bloc répond à « et alors ? ».
 * Il charge sa propre route pour que la vue d'ensemble s'affiche sans l'attendre.
 *
 * Règle tenue partout ici : aucun taux n'est montré sous le seuil
 * d'observations (`insightRate` rend `null`), et une case vide vaut mieux qu'un
 * pourcentage qui ment. Un tableau de bord se lit vite et se retient longtemps
 * — s'il se trompe, la décision se trompe avec lui.
 */

/** « 3 h », « 1 j 4 h », « 12 min » — la précision utile, pas plus */
function formatDelay(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  const days = Math.floor(hours / 24);
  const rest = Math.round(hours - days * 24);
  return rest === 0 ? `${days} j` : `${days} j ${rest} h`;
}

function Section({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 space-y-3" aria-label={title}>
      <div className="space-y-0.5">
        <h3 className="text-sm font-black flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {hint && <p className="text-[11px] text-ink-soft">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Une mesure et ce qu'elle veut dire. `tone` ne sert qu'à ce qui appelle une action */
function Measure({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "alert";
}) {
  return (
    <div className={cn("rounded-lg p-3", tone === "alert" ? "bg-danger-surface" : "bg-paper")}>
      <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">{label}</p>
      <p
        className={cn(
          "display text-2xl tabular-nums leading-tight",
          tone === "alert" ? "text-danger" : "text-primary",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-ink-soft font-semibold leading-snug">{hint}</p>}
    </div>
  );
}

/** Une part d'un tout : la barre dit le rapport, le chiffre dit la quantité */
function ShareRow({
  label,
  value,
  total,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  hint?: string;
}) {
  const rate = insightRate(value, total);
  const width = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold text-ink-soft truncate">{label}</p>
        <p className="flex items-baseline gap-2 shrink-0">
          {rate !== null && (
            <span className="text-[10px] font-black tabular-nums text-ink-faint">
              {Math.round(rate * 100)} %
            </span>
          )}
          <span className="text-sm font-black text-ink tabular-nums leading-none">{value}</span>
        </p>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-paper overflow-hidden">
        <div className="h-full rounded-full bg-blue" style={{ width: `${width}%` }} />
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-ink-faint">{hint}</p>}
    </div>
  );
}

/** Ventilation par modalité — catégorie, format, genre */
function Breakdown({ rows, total, showMatched }: { rows: BreakdownDto[]; total: number; showMatched?: boolean }) {
  if (rows.length === 0) return <p className="text-[11px] text-ink-faint">Rien à ventiler pour l&apos;instant.</p>;
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <ShareRow
          key={row.key}
          label={row.label}
          value={row.count}
          total={total}
          hint={
            showMatched && row.matched !== undefined
              ? `${row.matched} devenue${row.matched > 1 ? "s" : ""} un match`
              : undefined
          }
        />
      ))}
    </div>
  );
}

export function AdminInsights() {
  const [data, setData] = useState<AdminInsightsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AdminInsightsDto>("/admin/insights")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Analyse indisponible"));
  }, []);

  if (error) {
    return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  }
  if (!data) {
    return (
      <div className="space-y-4" aria-busy aria-label="Chargement de l'analyse">
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const { activation, liquidity, demand, timing, friction } = data;
  const announcementsTotal = data.announcementFunnel[0]?.count ?? 0;
  const growthBars = data.growth.map((w) => {
    const date = new Date(`${w.week}T12:00:00`);
    return {
      key: w.week,
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      fullLabel: `Semaine du ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`,
      value: w.signups,
    };
  });
  const activeBars = data.growth.map((w, i) => ({
    ...growthBars[i],
    key: `a-${w.week}`,
    value: w.active,
  }));

  return (
    <div className="space-y-4">
      {/* ————— Les deux entonnoirs ————— */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <Section
          title="Le parcours d'une annonce"
          icon={<Filter size={14} className="text-accent" />}
          hint="De la publication au terrain. La marche en rouge est celle qui coûte le plus."
        >
          <Funnel steps={data.announcementFunnel} ariaLabel="Entonnoir des annonces" />
        </Section>

        <Section
          title="Le parcours d'une proposition"
          icon={<Layers size={14} className="text-accent" />}
          hint="Un match naît à la seconde signature. Une seule ne confirme rien."
        >
          <Funnel steps={data.responseFunnel} ariaLabel="Entonnoir des propositions" />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Measure
              label="Sans suite &gt; 7 j"
              value={timing.stalePending}
              hint="propositions sans la moindre signature"
            />
            <Measure
              label="Bloquées"
              value={timing.deadPending}
              tone={timing.deadPending > 0 ? "alert" : "neutral"}
              hint="annonce annulée ou date passée : plus rien n'est possible"
            />
          </div>
        </Section>
      </div>

      {/* ————— Les délais ————— */}
      <Section
        title="Les délais"
        icon={<Clock size={14} className="text-accent" />}
        hint="Médianes. Un service d'appariement se juge autant à sa vitesse qu'à son taux."
      >
        <div className="grid grid-cols-2 gap-2">
          <Measure
            label="Publication → 1re proposition"
            value={formatDelay(timing.hoursToFirstResponse)}
            hint="le temps que l'offre trouve preneur"
          />
          <Measure
            label="1re → 2e signature"
            value={formatDelay(timing.hoursBetweenSignatures)}
            hint="le temps de se décider une fois en contact"
          />
        </div>
      </Section>

      {/* ————— L'activation ————— */}
      <Section
        title="Ce que font les coachs"
        icon={<Activity size={14} className="text-accent" />}
        hint={`Sur ${activation.coaches} coach${activation.coaches > 1 ? "s" : ""} actif${
          activation.coaches > 1 ? "s" : ""
        }. Un coach compte une fois, quel que soit son nombre d'actions.`}
      >
        <div className="space-y-2.5">
          <ShareRow label="Ont publié une annonce" value={activation.published} total={activation.coaches} />
          <ShareRow label="Ont proposé un match" value={activation.responded} total={activation.coaches} />
          <ShareRow label="Ont signé au moins une fois" value={activation.signed} total={activation.coaches} />
          <ShareRow label="Ont joué un match" value={activation.played} total={activation.coaches} />
          <ShareRow
            label="Jamais revenus après l'inscription"
            value={activation.neverReturned}
            total={activation.coaches}
            hint="aucune connexion passé les 24 premières heures"
          />
        </div>
      </Section>

      {/* ————— La liquidité ————— */}
      <Section
        title="Ce qui est disponible maintenant"
        icon={<Compass size={14} className="text-accent" />}
        hint="Sans stock à venir, aucun appariement n'est possible — quel que soit le nombre d'inscrits."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Measure
            label="Annonces à venir"
            value={liquidity.openUpcoming}
            hint={`portées par ${liquidity.openUpcomingTeams} équipe${liquidity.openUpcomingTeams > 1 ? "s" : ""}`}
          />
          <Measure
            label="Dates déclarées"
            value={liquidity.upcomingAvailabilities}
            hint={`par ${liquidity.availabilityTeams} équipe${liquidity.availabilityTeams > 1 ? "s" : ""}`}
          />
          <Measure
            label="Départements denses"
            value={`${liquidity.denseDepartments} / ${liquidity.departments}`}
            hint="au moins deux équipes : il en faut deux pour un match"
          />
          <Measure
            label="Équipes isolées"
            value={liquidity.isolatedTeams}
            tone={liquidity.isolatedTeams > 0 ? "alert" : "neutral"}
            hint="seules dans leur département, personne à qui jouer sur place"
          />
        </div>
      </Section>

      {/* ————— La demande ————— */}
      <div className="grid md:grid-cols-3 gap-4 items-start">
        <Section title="Par catégorie" icon={<Layers size={14} className="text-accent" />}>
          <Breakdown rows={demand.byCategory} total={announcementsTotal} showMatched />
        </Section>
        <Section title="Par format" icon={<Layers size={14} className="text-accent" />}>
          <Breakdown rows={demand.byFormat} total={announcementsTotal} />
        </Section>
        <Section
          title="Par genre"
          icon={<Layers size={14} className="text-accent" />}
          hint={`${demand.sos} annonce${demand.sos > 1 ? "s" : ""} republiée${
            demand.sos > 1 ? "s" : ""
          } après un désistement.`}
        >
          <Breakdown rows={demand.byGender} total={announcementsTotal} />
        </Section>
      </div>

      {/* ————— La croissance ————— */}
      <Section
        title="Croissance — 12 semaines"
        icon={<TrendingUp size={14} className="text-accent" />}
        hint="Inscriptions de coachs, puis comptes réellement actifs la même semaine."
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">
              Nouveaux coachs
            </p>
            <BarChart data={growthBars} ariaLabel="Inscriptions de coachs par semaine" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-ink-faint tracking-widest uppercase">
              Comptes actifs
            </p>
            <BarChart data={activeBars} ariaLabel="Comptes actifs par semaine" />
          </div>
        </div>
      </Section>

      {/* ————— Les frictions ————— */}
      <Section
        title="Ce qui grippe"
        icon={<AlertTriangle size={14} className="text-accent" />}
        hint="Chaque ligne est une réparation possible, pas une fatalité."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Measure
            label="Annonces sans réponse"
            value={friction.expiredUnanswered}
            tone={friction.expiredUnanswered > 0 ? "alert" : "neutral"}
            hint="date passée, aucune proposition : de la demande jamais servie"
          />
          <Measure label="Annonces annulées" value={friction.announcementsCancelled} />
          <Measure label="Matchs annulés" value={friction.matchesCancelled} />
          <Measure
            label="Signalements ouverts"
            value={friction.openReports}
            tone={friction.openReports > 0 ? "alert" : "neutral"}
          />
          <Measure label="Conversations" value={friction.conversations} />
          <Measure
            label="Messages"
            value={friction.messages}
            hint={
              friction.conversations > 0
                ? `${Math.round((friction.messages / friction.conversations) * 10) / 10} par conversation`
                : undefined
            }
          />
        </div>
      </Section>
    </div>
  );
}

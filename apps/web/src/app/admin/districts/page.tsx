"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPinned, TrendingUp } from "lucide-react";
import {
  matchRate,
  DISTRICT_MIN_ANNOUNCEMENTS,
  type DistrictStatsDto,
} from "@teamnexus/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DistrictReference } from "@/components/admin/DistrictReference";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/**
 * Où se concentre la liquidité, département par département.
 *
 * Cet écran ne sert pas à admirer des totaux : il sert à trancher OÙ concentrer
 * l'effort. Un marché de matchs amicaux ne devient utilisable qu'une fois
 * dense — cinq critères doivent s'aligner (secteur, date, catégorie, niveau,
 * terrain) — et être présent partout avec quarante clubs, c'est n'être
 * utilisable nulle part.
 *
 * Le chiffre qui décide est le TAUX D'APPARIEMENT, pas le nombre d'inscrits :
 * cent annonces dont dix aboutissent décrivent un marché mort.
 */
export default function DistrictsPage() {
  const [rows, setRows] = useState<DistrictStatsDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await api<DistrictStatsDto[]>("/admin/districts"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = rows?.reduce((sum, r) => sum + r.teams, 0) ?? 0;
  const leader = rows?.find((r) => r.code !== null) ?? null;

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <MapPinned size={22} />
        </span>
        <div className="min-w-[14rem] flex-1">
          <h2 className="display text-lg">Liquidité par département</h2>
          <p className="text-xs text-white/80">
            Où concentrer l&apos;effort, et où l&apos;on est devenu incontournable.
          </p>
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {/* Dit une fois, en haut : sans cette précision, « district » et
          « département » finiraient par être pris l'un pour l'autre. */}
      <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
        Le rattachement se fait par la <strong>ville de l&apos;équipe</strong>, au département. Les districts de
        football ne s&apos;y superposent pas exactement — quelques-uns couvrent deux départements — et la FFF n&apos;en
        publie pas le découpage réutilisable. C&apos;est une approximation, suffisante pour décider où porter
        l&apos;effort.
      </p>

      {!rows ? (
        <CardGridSkeleton cards={3} />
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-bold">Aucune équipe pour l&apos;instant</p>
        </div>
      ) : (
        <>
          {leader && (
            <section className="card p-5 space-y-2" aria-label="Département le plus dense">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">
                Département le plus dense
              </p>
              <p className="display text-2xl">{leader.label}</p>
              <p className="text-xs text-ink-soft">
                {leader.teams} équipe{leader.teams > 1 ? "s" : ""} sur {total} au total
                {total > 0 && ` — ${Math.round((leader.teams / total) * 100)} % de la base`}
              </p>
            </section>
          )}

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-ink-faint border-b border-line">
                  <th className="px-4 py-3">Département</th>
                  <th className="px-3 py-3 text-right">Coachs</th>
                  <th className="px-3 py-3 text-right">Équipes</th>
                  <th className="px-3 py-3 text-right">Annonces</th>
                  <th className="px-3 py-3 text-right">Appariées</th>
                  <th className="px-3 py-3 text-right">Joués</th>
                  <th className="px-3 py-3 text-right">Dispos</th>
                  <th className="px-4 py-3 text-right">Taux</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Row key={row.code ?? "inconnu"} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-ink-faint px-1">
            Le taux d&apos;appariement reste masqué en dessous de {DISTRICT_MIN_ANNOUNCEMENTS} annonces : calculé sur
            trois publications, il ne mesurerait rien et ferait prendre de mauvaises décisions.
          </p>
        </>
      )}

      {/* Le référentiel sous les chiffres : on vient ici pour décider, et on
          y corrige le découpage quand il fausse ce qu'on lit. */}
      <DistrictReference />
    </div>
  );
}

function Row({ row }: { row: DistrictStatsDto }) {
  const rate = matchRate(row);
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3 font-bold">
        {row.label}
        {row.code === null && (
          <span className="block text-[11px] font-semibold text-ink-faint">
            Ville absente de l&apos;annuaire des communes
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{row.coaches}</td>
      <td className="px-3 py-3 text-right tabular-nums font-bold">{row.teams}</td>
      <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{row.announcements}</td>
      <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{row.announcementsMatched}</td>
      {/* Ce que les appariements ont réellement donné : une annonce appariée
          dont le match n'a jamais été joué ne prouve rien du département. */}
      <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{row.matchesPlayed}</td>
      <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{row.availabilities}</td>
      <td className="px-4 py-3 text-right">
        {rate === null ? (
          <span className="text-xs text-ink-faint">—</span>
        ) : (
          <span
            className={cn(
              "chip",
              rate >= 0.5 ? "bg-success-soft text-success" : rate >= 0.25 ? "bg-sun-soft text-sun" : "bg-coral-soft text-coral",
            )}
          >
            <TrendingUp size={11} aria-hidden />
            {Math.round(rate * 100)} %
          </span>
        )}
      </td>
    </tr>
  );
}

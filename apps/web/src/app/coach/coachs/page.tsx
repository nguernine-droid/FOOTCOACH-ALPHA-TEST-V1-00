"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Megaphone, Users } from "lucide-react";
import { categoryLabel, type CategoryCoachDto, type CategoryStatsDto } from "@teamnexus/shared";
import { api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { LevelBadge } from "@/components/LevelBadge";
import { TeamLogo } from "@/components/TeamLogo";
import { CoachCardSheet } from "@/components/coach/CoachCardSheet";
import { ButtonLink } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/**
 * Les confrères de ma catégorie, dans mon périmètre.
 *
 * Ouverte depuis le bandeau du tableau de bord, elle répond à « qui joue dans
 * mon tableau, autour de moi ? » — avant même qu'une annonce soit publiée. Le
 * même périmètre que le radar, réglé au même endroit : deux portées qui
 * pourraient diverger seraient un piège.
 *
 * L'identité des coachs y est visible sans qu'on se soit croisés, ce qui n'est
 * vrai nulle part ailleurs dans l'application (voir `canSeeCoachCard` côté
 * serveur, règle 7). C'est ce qui permet d'ouvrir leur carte d'un appui.
 */
export default function CategoryCoachesPage() {
  const [coaches, setCoaches] = useState<CategoryCoachDto[] | null>(null);
  const [stats, setStats] = useState<CategoryStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Carte ouverte en feuille — la même que partout ailleurs */
  const [cardOf, setCardOf] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, categoryStats] = await Promise.all([
        api<CategoryCoachDto[]>("/coaches/my-category"),
        api<CategoryStatsDto>("/announcements/category-stats").catch(() => null),
      ]);
      setCoaches(list);
      setStats(categoryStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Users size={22} />
        </span>
        <div className="min-w-[14rem] flex-1">
          <h2 className="display text-lg">
            Coachs {stats?.category ? categoryLabel(stats.category) : "de ma catégorie"}
          </h2>
          <p className="text-xs text-white/80">
            Ceux qui encadrent une équipe de votre tableau, dans votre périmètre de radar.
          </p>
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {!coaches ? (
        <CardGridSkeleton cards={3} />
      ) : coaches.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Users size={22} />
          </span>
          <p className="text-sm font-bold">Aucun coach de votre catégorie dans le périmètre</p>
          <p className="text-xs text-ink-soft">
            Élargissez votre périmètre depuis le radar, ou revenez quand d&apos;autres clubs se seront inscrits.
          </p>
          <ButtonLink href="/coach" variant="soft" className="w-full sm:w-auto">
            Ouvrir le radar
          </ButtonLink>
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {coaches.map((coach) => (
            <li key={coach.id}>
              <button
                type="button"
                onClick={() => setCardOf(coach.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition
                  hover:bg-blue-faint active:bg-blue-soft"
              >
                <Avatar name={coach.nickname} avatarUrl={coach.avatarUrl} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="font-bold flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">{coach.nickname}</span>
                    <LevelBadge level={coach.level} />
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                    <TeamLogo name={coach.team.name} logoUrl={coach.team.logoUrl} size={16} />
                    <span className="truncate">
                      {coach.team.name} · {coach.team.city}
                      {coach.distanceKm !== null && ` · ${coach.distanceKm.toLocaleString("fr-FR")} km`}
                    </span>
                  </span>
                  {/* Celui qui cherche un adversaire en ce moment : c'est avec
                      lui qu'il y a quelque chose à faire tout de suite. */}
                  {coach.hasOpenAnnouncement && (
                    <span className="chip bg-accent-surface text-accent mt-1">
                      <Megaphone size={11} /> cherche un adversaire
                    </span>
                  )}
                </span>
                <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/coach"
        className="flex items-center justify-center min-h-11 rounded-lg text-xs font-bold text-blue
          transition hover:text-blue-dark active:bg-blue-soft"
      >
        Retour au tableau de bord
      </Link>

      {cardOf && <CoachCardSheet coachId={cardOf} onClose={() => setCardOf(null)} />}
    </div>
  );
}

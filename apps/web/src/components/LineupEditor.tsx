"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { LineupDto, LineupPlayerDto, TeamMemberDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Pitch } from "@/components/Pitch";

// Éditeur de composition (coach) : sélectionner un joueur du banc, cliquer sur le
// terrain pour le placer ; cliquer un joueur placé pour le retirer. Sauvegarde auto.
export function LineupEditor({ matchId, presentPlayerIds }: { matchId: string; presentPlayerIds: string[] }) {
  const [lineup, setLineup] = useState<LineupDto | null>(null);
  const [roster, setRoster] = useState<TeamMemberDto[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, members] = await Promise.all([
        api<LineupDto>(`/matches/${matchId}/lineup`),
        api<TeamMemberDto[]>("/team/members"),
      ]);
      setLineup(l);
      setRoster(members.filter((m) => m.accountStatus === "active"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(players: LineupPlayerDto[]) {
    setLineup((l) => (l ? { ...l, mine: players } : l));
    try {
      await api(`/matches/${matchId}/lineup`, {
        method: "PUT",
        body: JSON.stringify({ players: players.map((p) => ({ playerId: p.playerId, x: p.x, y: p.y })) }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sauvegarde impossible");
      load();
    }
  }

  if (error && !lineup) return <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>;
  if (!lineup) return <p className="text-xs text-ink-soft animate-soft-pulse">Chargement de la compo…</p>;

  const placedIds = new Set(lineup.mine.map((p) => p.playerId));
  const bench = roster.filter((m) => !placedIds.has(m.id));

  function place(x: number, y: number) {
    if (!selected) return;
    const member = roster.find((m) => m.id === selected);
    if (!member) return;
    save([...lineup!.mine, { playerId: member.id, firstName: member.firstName, lastName: member.lastName, x, y }]);
    setSelected(null);
  }

  function remove(playerId: string) {
    save(lineup!.mine.filter((p) => p.playerId !== playerId));
  }

  const visibleAt = new Date(lineup.opponentVisibleAt);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-ink-soft">
          {selected
            ? "Cliquez sur le terrain pour placer le joueur sélectionné."
            : "Sélectionnez un joueur ci-dessous, puis cliquez sur le terrain. Cliquez un joueur placé pour le retirer."}
        </p>
        <Pitch players={lineup.mine} tone="green" interactive onPitchClick={place} onPlayerClick={remove} />
        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {bench.length === 0 && <p className="text-xs text-ink-soft">Tous vos joueurs sont placés.</p>}
          {bench.map((m) => {
            const isPresent = presentPlayerIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(selected === m.id ? null : m.id)}
                className={cn(
                  "chip border transition",
                  selected === m.id
                    ? "bg-pitch text-white border-pitch shadow-sm"
                    : "bg-white border-line text-ink hover:border-pitch/50",
                )}
              >
                {isPresent && <span className="w-1.5 h-1.5 rounded-full bg-pitch inline-block" aria-label="Présent au match" />}
                {m.firstName} {m.lastName}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-ink-soft">● vert = joueur ayant confirmé sa présence.</p>
      </div>

      <div className="border-t border-line pt-4 space-y-2">
        <p className="text-xs font-bold text-ink">Composition adverse</p>
        {lineup.opponentLocked ? (
          <p className="text-xs font-semibold text-ink-soft bg-paper rounded-lg px-4 py-3 flex items-center gap-2">
            <Lock size={14} className="text-ink-soft shrink-0" />
            Visible 2h avant le coup d&apos;envoi — le{" "}
            {visibleAt.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à{" "}
            {visibleAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.
          </p>
        ) : lineup.opponent && lineup.opponent.length > 0 ? (
          <Pitch players={lineup.opponent} tone="orange" />
        ) : (
          <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
            Le coach adverse n&apos;a pas encore publié sa composition.
          </p>
        )}
      </div>
    </div>
  );
}

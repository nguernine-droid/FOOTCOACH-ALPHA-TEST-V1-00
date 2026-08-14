"use client";

import { useRef, useState } from "react";
import { Camera, Shield, Trash2 } from "lucide-react";
import type { CoachTeamDto } from "@teamnexus/shared";
import { ApiError, api } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { TeamLogo } from "@/components/TeamLogo";
import { Button } from "@/components/ui/Button";

/** Même plafond que la photo de profil — l'API refuse au-delà, autant le dire avant */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/**
 * L'écusson du club, réglé équipe par équipe.
 *
 * Rangé dans le profil et non dans « Mes équipes » : c'est une question
 * d'identité, à côté de sa photo et de son surnom, et c'est là que le coach va
 * quand il veut « se montrer ». La même carte se règle aussi depuis l'écran des
 * équipes, où l'on arrive par un autre chemin.
 *
 * Une ligne par équipe encadrée : un coach qui a les U13 et les U15 met souvent
 * le même écusson aux deux, mais rien ne l'y oblige — un club en héberge parfois
 * deux (entente, section féminine).
 */
export function TeamLogoCard() {
  const { teams, reloadTeams } = useActiveTeam();
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Un input caché par équipe : le même partagé aurait forcé à retenir laquelle
  // vient d'être visée, pour rien.
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function upload(team: CoachTeamDto, file: File) {
    if (file.size > MAX_LOGO_BYTES) {
      setError("Image trop lourde (2 Mo maximum)");
      return;
    }
    setBusyTeamId(team.id);
    setError(null);
    try {
      const body = new FormData();
      body.append("logo", file);
      await api<CoachTeamDto>(`/coach/teams/${team.id}/logo`, { method: "POST", body });
      await reloadTeams();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi impossible");
    } finally {
      setBusyTeamId(null);
      const input = inputs.current[team.id];
      if (input) input.value = "";
    }
  }

  async function remove(team: CoachTeamDto) {
    setBusyTeamId(team.id);
    setError(null);
    try {
      await api<CoachTeamDto>(`/coach/teams/${team.id}/logo`, { method: "DELETE" });
      await reloadTeams();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Suppression impossible");
    } finally {
      setBusyTeamId(null);
    }
  }

  // Aucune équipe encadrée : rien à habiller, la carte ne s'affiche pas.
  if (teams.length === 0) return null;

  return (
    <section className="card p-5 space-y-3" aria-label="Logo de mon club">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
          <Shield size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="display text-lg">Logo de mon club</h3>
          <p className="text-xs text-ink-soft">
            Il s&apos;affiche sur vos annonces et vos feuilles de match, à la place des initiales.
          </p>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}

      <ul className="space-y-2">
        {teams.map((team) => (
          <li key={team.id} className="flex items-center gap-3 rounded-lg bg-paper px-3 py-2.5">
            <TeamLogo name={team.name} logoUrl={team.logoUrl} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold truncate">{team.name}</span>
              <span className="block text-xs text-ink-soft truncate">
                {team.club ? team.club.name : team.city}
              </span>
            </span>
            <input
              ref={(el) => {
                inputs.current[team.id] = el;
              }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(team, file);
              }}
            />
            <span className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="soft"
                disabled={busyTeamId === team.id}
                onClick={() => inputs.current[team.id]?.click()}
              >
                <Camera size={13} /> {team.logoUrl ? "Changer" : "Ajouter"}
              </Button>
              {team.logoUrl && (
                <button
                  type="button"
                  onClick={() => remove(team)}
                  disabled={busyTeamId === team.id}
                  className="icon-btn text-ink-faint hover:text-coral hover:bg-coral-soft"
                  aria-label={`Retirer le logo de ${team.name}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

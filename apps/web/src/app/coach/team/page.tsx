"use client";

import { useState } from "react";
import { Building2, Clock, ShieldCheck, Users } from "lucide-react";
import type { UserDto } from "@footcoach/shared";
import { api, ApiError, getStoredUser, refreshSession } from "@/lib/api";
import { useActiveTeam } from "@/components/ActiveTeamContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Affiliation du coach à un club (via le code d'affiliation communiqué par le club)
function ClubAffiliationCard() {
  const [user, setUser] = useState<UserDto | null>(() => getStoredUser());
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  if (user.clubName) {
    return (
      <div className="card px-4 py-3 flex items-center gap-2.5">
        <Building2 size={15} className="text-blue shrink-0" />
        <p className="text-sm">
          Club : <span className="font-bold">{user.clubName}</span>
        </p>
      </div>
    );
  }

  if (user.pendingClubName) {
    return (
      <div className="card px-4 py-3 flex items-center gap-2.5 border-l-4 border-l-gold">
        <Clock size={15} className="text-sun shrink-0" />
        <p className="text-sm">
          Demande d&apos;affiliation en attente auprès de <span className="font-bold">{user.pendingClubName}</span>.
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/coach/affiliation", { method: "POST", body: JSON.stringify({ code }) });
      const refreshed = await refreshSession();
      setUser(refreshed ?? getStoredUser());
      setCode("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Demande impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
          <Building2 size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Rejoindre un club</p>
          <p className="text-xs text-ink-soft">
            Votre club vous a communiqué un code d&apos;affiliation ? Saisissez-le pour lui envoyer une demande.
          </p>
        </div>
        {!open && (
          <Button size="sm" variant="soft" onClick={() => setOpen(true)}>
            Saisir un code
          </Button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5 flex-1 min-w-[10rem]">
            <label className="text-xs font-bold text-ink-soft" htmlFor="affiliation-code">
              Code d&apos;affiliation
            </label>
            <input
              id="affiliation-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              className="field font-mono tracking-widest"
              placeholder="CLUBAA"
            />
          </div>
          <Button type="submit" disabled={busy || code.length < 4}>
            Envoyer
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </form>
      )}
      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
    </div>
  );
}

/**
 * Mes équipes : identité des équipes encadrées et rattachement au club.
 * La V1 ne gère pas d'effectif — les matchs amicaux se jouent entre coachs.
 */
export default function CoachTeamPage() {
  const { teams, activeTeamId, setActiveTeam } = useActiveTeam();

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Users size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="display text-lg">Mes équipes</h2>
          <p className="text-xs text-white/80">
            {teams.length > 1
              ? "Choisissez l'équipe active : annonces, radar et matchs la suivent."
              : "L'équipe au nom de laquelle vous publiez vos annonces."}
          </p>
        </div>
      </div>

      <ClubAffiliationCard />

      <div className="stagger space-y-2">
        {teams.map((team) => {
          const active = team.id === activeTeamId;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => setActiveTeam(team.id)}
              aria-pressed={active}
              className={cn(
                "w-full card px-4 py-3 flex items-center gap-3 text-left transition",
                active ? "border-blue ring-2 ring-blue/15" : "hover:border-blue/40",
              )}
            >
              <span
                className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center shrink-0",
                  active ? "bg-blue text-white" : "bg-paper text-ink-soft",
                )}
              >
                <Users size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold truncate">{team.name}</span>
                <span className="block text-xs text-ink-soft truncate">{team.city}</span>
              </span>
              {team.role === "adjoint" && <span className="chip bg-paper text-ink-soft shrink-0">Adjoint</span>}
              {active && (
                <span className="chip bg-blue-soft text-navy-700 shrink-0">
                  <ShieldCheck size={11} /> Équipe active
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

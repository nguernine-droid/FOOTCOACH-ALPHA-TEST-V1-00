"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, LogOut, RefreshCw, XCircle } from "lucide-react";
import type { TeamJoinInfoDto, UserDto } from "@footcoach/shared";
import { api, logout, refreshSession } from "@/lib/api";
import { Button } from "@/components/ui/Button";

/**
 * Écran affiché à un joueur/parent connecté mais sans équipe :
 * demande en attente de validation par le coach, ou refusée (re-candidature).
 */
export function PendingScreen({ user, onRefreshed }: { user: UserDto; onRefreshed: (user: UserDto) => void }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(user.joinRequestStatus ?? null);
  const [teamName, setTeamName] = useState(user.pendingTeamName ?? null);
  // Re-candidature après refus
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<TeamJoinInfoDto | null>(null);
  const [childUserId, setChildUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const fresh = await refreshSession();
      if (fresh?.teamId) {
        onRefreshed(fresh);
        return;
      }
      if (fresh) {
        setStatus(fresh.joinRequestStatus ?? null);
        setTeamName(fresh.pendingTeamName ?? null);
      }
    } finally {
      setChecking(false);
    }
  }, [onRefreshed]);

  // Au montage : si le coach a accepté entre-temps, on entre directement dans l'app
  useEffect(() => {
    check();
  }, [check]);

  async function loadTeam(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setInfo(await api<TeamJoinInfoDto>(`/teams/join/${code.trim().toUpperCase()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setBusy(false);
    }
  }

  async function resubmit() {
    setBusy(true);
    setError(null);
    try {
      await api("/join-requests", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          ...(user.role === "parent" && childUserId ? { childUserId } : {}),
        }),
      });
      await check();
      setStatus("pending");
      setTeamName(info?.teamName ?? null);
      setInfo(null);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto pt-8">
      {status === "pending" ? (
        <div className="card p-8 text-center space-y-4 animate-rise-in">
          <span className="w-14 h-14 rounded-full bg-sun-soft text-sun flex items-center justify-center mx-auto">
            <Clock3 size={26} />
          </span>
          <div className="space-y-1">
            <h2 className="text-lg font-black">Demande en attente</h2>
            <p className="text-sm text-ink-soft">
              Votre demande pour rejoindre {teamName ? <span className="font-bold">{teamName}</span> : "l'équipe"}{" "}
              attend la validation du coach. Vous recevrez l&apos;accès dès qu&apos;il l&apos;aura acceptée.
            </p>
          </div>
          <Button className="w-full" onClick={check} disabled={checking}>
            <RefreshCw size={15} className={checking ? "animate-spin" : undefined} />
            {checking ? "Vérification…" : "Vérifier maintenant"}
          </Button>
        </div>
      ) : (
        <div className="card p-8 space-y-4 animate-rise-in">
          <div className="text-center space-y-1">
            <span className="w-14 h-14 rounded-full bg-coral-soft text-coral flex items-center justify-center mx-auto mb-3">
              <XCircle size={26} />
            </span>
            <h2 className="text-lg font-black">
              {status === "declined" ? "Demande refusée" : "Aucune équipe"}
            </h2>
            <p className="text-sm text-ink-soft">
              {status === "declined"
                ? `Le coach${teamName ? ` de ${teamName}` : ""} a refusé votre demande. Vérifiez le code auprès de lui, ou rejoignez une autre équipe.`
                : "Saisissez le code d'équipe transmis par le coach pour envoyer une demande."}
            </p>
          </div>

          {!info ? (
            <form onSubmit={loadTeam} className="space-y-3">
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="field text-center text-xl font-black tracking-[0.3em] uppercase"
                placeholder="ABC123"
                maxLength={10}
                aria-label="Code d'équipe"
              />
              {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Vérification…" : "Vérifier le code"}
              </Button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-center">
                {info.teamName} · {info.city}
              </p>
              {user.role === "parent" && (
                <div className="space-y-1.5">
                  <label htmlFor="child" className="text-xs font-bold text-ink-soft">Votre enfant dans l&apos;équipe</label>
                  <select id="child" required value={childUserId} onChange={(e) => setChildUserId(e.target.value)} className="field">
                    <option value="">Choisir…</option>
                    {info.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                        {p.hasParent ? " (a déjà un parent lié)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => setInfo(null)}>Retour</Button>
                <Button onClick={resubmit} disabled={busy || (user.role === "parent" && !childUserId)}>
                  {busy ? "Envoi…" : "Envoyer la demande"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-center mt-4">
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="text-xs font-bold text-ink-soft hover:text-coral inline-flex items-center gap-1.5 transition"
        >
          <LogOut size={13} /> Se déconnecter
        </button>
      </div>
    </div>
  );
}

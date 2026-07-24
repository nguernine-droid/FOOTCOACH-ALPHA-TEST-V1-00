"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Ticket, Trash2, Users, X } from "lucide-react";
import type { ClubTeamDto } from "@footcoach/shared";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

function CreateTeamForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/club/teams", { method: "POST", body: JSON.stringify({ name, city }) });
      setName("");
      setCity("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={15} /> Nouvelle équipe
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-3">
      <p className="text-sm font-bold">Nouvelle équipe</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink-soft" htmlFor="team-name">Nom de l&apos;équipe</label>
          <input id="team-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Étoile U13" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink-soft" htmlFor="team-city">Ville</label>
          <input id="team-city" required value={city} onChange={(e) => setCity(e.target.value)} className="field" placeholder="Lyon" />
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
        <Button type="submit" disabled={busy}>Créer l&apos;équipe</Button>
      </div>
    </form>
  );
}

function TeamCard({ team, onChanged }: { team: ClubTeamDto; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [city, setCity] = useState(team.city);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 space-y-3 animate-rise-in">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center shrink-0">
          <Users size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate">{team.name}</p>
          <p className="text-xs text-ink-soft truncate">{team.city}</p>
        </div>
        <span className="chip bg-paper text-ink-soft shrink-0">
          {team.playerCount} joueur{team.playerCount > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {team.coaches.length === 0 ? (
          <span className="chip bg-sun-soft text-sun">
            <ShieldCheck size={11} /> Aucun coach affecté
          </span>
        ) : (
          team.coaches.map((c) => (
            <span key={c.id} className="chip bg-pitch-soft text-pitch-deep">
              <ShieldCheck size={11} /> {c.firstName} {c.lastName}
              {c.role === "adjoint" ? " (adjoint)" : ""}
            </span>
          ))
        )}
        <span className="chip bg-paper text-ink-soft font-mono">
          <Ticket size={11} /> {team.joinCode}
        </span>
      </div>

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action(async () => {
              await api(`/club/teams/${team.id}`, { method: "PATCH", body: JSON.stringify({ name, city }) });
              setEditing(false);
              onChanged();
            });
          }}
          className="bg-paper rounded-lg px-4 py-3 space-y-2.5"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink-soft" htmlFor={`name-${team.id}`}>Nom</label>
            <input id={`name-${team.id}`} required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink-soft" htmlFor={`city-${team.id}`}>Ville</label>
            <input id={`city-${team.id}`} required value={city} onChange={(e) => setCity(e.target.value)} className="field" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
            <Button type="submit" size="sm" disabled={busy}>Enregistrer</Button>
          </div>
        </form>
      )}

      {!editing && (
        <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(true)}>
            <Pencil size={13} /> Renommer
          </Button>
          {confirmDelete ? (
            <>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    await api(`/club/teams/${team.id}`, { method: "DELETE" });
                    onChanged();
                  })
                }
              >
                <Trash2 size={13} /> Confirmer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                <X size={13} /> Annuler
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} /> Supprimer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClubTeamsPage() {
  const [teams, setTeams] = useState<ClubTeamDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTeams(await api<ClubTeamDto[]>("/club/teams"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !teams) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!teams) return <CardGridSkeleton cards={2} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-lg px-1">Équipes ({teams.length})</h2>
      </div>

      <CreateTeamForm onCreated={load} />

      {teams.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Users size={22} />
          </span>
          <p className="text-sm text-ink-soft font-medium">Aucune équipe pour l&apos;instant.</p>
          <p className="text-xs text-ink-soft">Créez votre première équipe ci-dessus.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 items-start">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

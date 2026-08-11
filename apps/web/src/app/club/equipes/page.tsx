"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import type { ClubCoachDto, ClubTeamDto, TeamCoachRole } from "@footcoach/shared";
import { api, ApiError } from "@/lib/api";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/** Le CTA vit dans le pied de la feuille : il vise le formulaire à distance */
const TEAM_FORM_ID = "club-new-team";

function CreateTeamSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
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
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      label="Nouvelle équipe"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form={TEAM_FORM_ID} disabled={busy}>
            Créer l&apos;équipe
          </Button>
        </div>
      }
    >
      <form id={TEAM_FORM_ID} onSubmit={submit} className="p-5 pt-2 space-y-4">
        <p className="text-base font-black">Nouvelle équipe</p>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink-soft" htmlFor="team-name">Nom de l&apos;équipe</label>
          <input id="team-name" required minLength={2} autoComplete="organization" autoCapitalize="words" enterKeyHint="next" value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Étoile U13" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink-soft" htmlFor="team-city">Ville</label>
          <input id="team-city" required autoComplete="address-level2" autoCapitalize="words" enterKeyHint="done" value={city} onChange={(e) => setCity(e.target.value)} className="field" placeholder="Lyon" />
        </div>
        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
      </form>
    </BottomSheet>
  );
}

function TeamCard({
  team,
  availableCoaches,
  onChanged,
}: {
  team: ClubTeamDto;
  availableCoaches: ClubCoachDto[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [city, setCity] = useState(team.city);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [pickCoach, setPickCoach] = useState("");
  const [pickRole, setPickRole] = useState<TeamCoachRole>("principal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coachs affiliés pas encore affectés à cette équipe
  const assignable = availableCoaches.filter((c) => !team.coaches.some((tc) => tc.id === c.id));

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
      </div>

      {/* Une ligne par coach : la croix de retrait était un carré de 11 px
          collé au libellé, à l'intérieur d'une pastille. */}
      {team.coaches.length === 0 ? (
        <span className="chip bg-sun-soft text-sun">
          <ShieldCheck size={11} /> Aucun coach affecté
        </span>
      ) : (
        <ul className="space-y-1.5">
          {team.coaches.map((c) => (
            <li key={c.id} className="flex items-center gap-2 bg-paper rounded-lg pl-3 pr-1 py-1">
              <ShieldCheck size={14} className="text-pitch shrink-0" aria-hidden />
              <span className="flex-1 min-w-0 text-xs font-bold truncate">
                {c.firstName} {c.lastName}
                {c.role === "adjoint" && <span className="text-ink-soft font-semibold"> · adjoint</span>}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    await api(`/club/teams/${team.id}/coaches/${c.id}`, { method: "DELETE" });
                    onChanged();
                  })
                }
                className="icon-btn text-ink-faint hover:text-coral hover:bg-coral-soft"
                aria-label={`Retirer ${c.firstName} ${c.lastName} de ${team.name}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {assigning ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action(async () => {
              await api(`/club/teams/${team.id}/coaches`, {
                method: "POST",
                body: JSON.stringify({ coachId: pickCoach, role: pickRole }),
              });
              setAssigning(false);
              setPickCoach("");
              onChanged();
            });
          }}
          className="bg-paper rounded-lg px-4 py-3 space-y-2.5"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink-soft" htmlFor={`coach-${team.id}`}>Coach</label>
            <select id={`coach-${team.id}`} required value={pickCoach} onChange={(e) => setPickCoach(e.target.value)} className="field">
              <option value="">Choisir un coach…</option>
              {assignable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink-soft" htmlFor={`role-${team.id}`}>Rôle</label>
            <select id={`role-${team.id}`} value={pickRole} onChange={(e) => setPickRole(e.target.value as TeamCoachRole)} className="field">
              <option value="principal">Coach principal</option>
              <option value="adjoint">Coach adjoint</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setAssigning(false)}>Annuler</Button>
            <Button type="submit" size="sm" disabled={busy || !pickCoach}>Affecter</Button>
          </div>
        </form>
      ) : (
        assignable.length > 0 && (
          <Button size="sm" variant="soft" disabled={busy} onClick={() => setAssigning(true)}>
            <UserPlus size={13} /> Affecter un coach
          </Button>
        )
      )}

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
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
            <Button type="submit" size="sm" disabled={busy}>Enregistrer</Button>
          </div>
        </form>
      )}

      {!editing && (
        <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
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
              <Button size="sm" variant="ghost" className="col-span-2" onClick={() => setConfirmDelete(false)}>
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

/** ?nouveau=1 (bouton « + » de la barre basse) ouvre la création */
function ClubTeams() {
  const router = useRouter();
  const params = useSearchParams();
  const [teams, setTeams] = useState<ClubTeamDto[] | null>(null);
  const [coaches, setCoaches] = useState<ClubCoachDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Ouverture par effet, pas par état initial : depuis la page elle-même, le
  // composant ne se remonte pas et l'état initial ne serait jamais relu.
  const wantsNew = params.get("nouveau") === "1";
  useEffect(() => {
    if (!wantsNew) return;
    setCreating(true);
    router.replace("/club/equipes");
  }, [wantsNew, router]);

  const load = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([
        api<ClubTeamDto[]>("/club/teams"),
        api<ClubCoachDto[]>("/club/coaches"),
      ]);
      setTeams(t);
      setCoaches(c);
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
        {/* Au pouce, la création passe par le « + » de la barre basse */}
        <Button size="sm" className="hidden min-[960px]:inline-flex" onClick={() => setCreating(true)}>
          <Plus size={14} /> Nouvelle équipe
        </Button>
      </div>

      {creating && <CreateTeamSheet onClose={() => setCreating(false)} onCreated={load} />}

      {teams.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <Users size={22} />
          </span>
          <p className="text-sm text-ink-soft font-medium">Aucune équipe pour l&apos;instant.</p>
          <p className="text-xs text-ink-soft">Créez votre première équipe (U11, U13, U15…).</p>
          <Button className="w-full sm:w-auto" onClick={() => setCreating(true)}>
            <Plus size={15} /> Nouvelle équipe
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 items-start">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} availableCoaches={coaches} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClubTeamsPage() {
  return (
    <Suspense fallback={<CardGridSkeleton cards={2} />}>
      <ClubTeams />
    </Suspense>
  );
}

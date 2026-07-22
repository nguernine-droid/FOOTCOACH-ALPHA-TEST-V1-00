"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, Pencil, Search, UserPlus, Users } from "lucide-react";
import type { PlayerPosition, TeamMemberDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: "gardien", label: "Gardien" },
  { value: "defenseur", label: "Défenseur" },
  { value: "milieu", label: "Milieu" },
  { value: "attaquant", label: "Attaquant" },
];

const POSITION_LABELS: Record<PlayerPosition, string> = {
  gardien: "Gardien",
  defenseur: "Défenseur",
  milieu: "Milieu",
  attaquant: "Attaquant",
};

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={cn(
        "inline-flex items-center gap-2 font-mono font-black text-sm tracking-[0.2em] rounded-lg px-3 py-1.5 border transition",
        copied ? "bg-pitch-soft text-pitch-deep border-pitch/30" : "bg-white border-line hover:border-pitch/50",
      )}
      aria-label={`Copier le code ${code}`}
    >
      {code}
      {copied ? <Check size={14} className="text-pitch" /> : <Copy size={14} className="text-ink-soft" />}
    </button>
  );
}

function PositionPicker({
  position,
  onChange,
}: {
  position: PlayerPosition | "";
  onChange: (p: PlayerPosition | "") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {POSITIONS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(position === p.value ? "" : p.value)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold border transition",
            position === p.value
              ? "bg-pitch text-white border-pitch shadow-sm"
              : "bg-white text-ink-soft border-line hover:border-pitch/40",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function EditPlayerForm({
  member,
  onDone,
}: {
  member: TeamMemberDto;
  onDone: () => void;
}) {
  const [position, setPosition] = useState<PlayerPosition | "">(member.position ?? "");
  const [jersey, setJersey] = useState(member.jerseyNumber ? String(member.jerseyNumber) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/team/members/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          position: position || null,
          jerseyNumber: jersey ? Number(jersey) : null,
        }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
      setBusy(false);
    }
  }

  return (
    <div className="bg-paper rounded-lg px-4 py-3 space-y-3">
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-ink-soft">Poste</p>
        <PositionPicker position={position} onChange={setPosition} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-ink-soft" htmlFor={`jersey-${member.id}`}>N° de maillot</label>
        <input
          id={`jersey-${member.id}`}
          type="number"
          min={1}
          max={99}
          value={jersey}
          onChange={(e) => setJersey(e.target.value)}
          className="field w-24"
          placeholder="10"
        />
      </div>
      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>Annuler</Button>
        <Button size="sm" onClick={save} disabled={busy}>Enregistrer</Button>
      </div>
    </div>
  );
}

function TeamContent() {
  const params = useSearchParams();
  const welcome = params.get("bienvenue") === "1";
  const [members, setMembers] = useState<TeamMemberDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<{ firstName: string; lastName: string; position: PlayerPosition | ""; jerseyNumber: string }>({
    firstName: "",
    lastName: "",
    position: "",
    jerseyNumber: "",
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await api<TeamMemberDto[]>("/team/members"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/team/invitations", {
        method: "POST",
        body: JSON.stringify({
          role: "player",
          firstName: form.firstName,
          lastName: form.lastName,
          ...(form.position && { position: form.position }),
          ...(form.jerseyNumber && { jerseyNumber: Number(form.jerseyNumber) }),
        }),
      });
      setForm({ firstName: "", lastName: "", position: "", jerseyNumber: "" });
      setAdding(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ajout impossible");
    } finally {
      setBusy(false);
    }
  }

  async function inviteParent(playerId: string) {
    setBusy(true);
    setError(null);
    try {
      await api("/team/invitations", { method: "POST", body: JSON.stringify({ role: "parent", playerId }) });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation impossible");
    } finally {
      setBusy(false);
    }
  }

  if (error && !members) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!members) return <CardGridSkeleton cards={2} />;

  const filtered = query
    ? members.filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(query.toLowerCase()))
    : members;

  return (
    <div className="space-y-4">
      {welcome && (
        <div className="hero-pitch p-6 space-y-2">
          <h2 className="display text-lg">Bienvenue ! Votre équipe est créée.</h2>
          <p className="text-sm text-white/90">Voici comment inviter votre effectif, en 3 petits pas :</p>
          <ol className="text-sm text-white/90 space-y-1 list-none">
            <li><span className="font-black">1.</span> Ajoutez un joueur avec le bouton ci-dessous → un code apparaît.</li>
            <li><span className="font-black">2.</span> Transmettez-lui ce code (SMS, papier…) : il crée son compte avec.</li>
            <li><span className="font-black">3.</span> Une fois son compte créé, cliquez « Inviter le parent » sur sa fiche.</li>
          </ol>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="display text-lg px-1">Mon équipe ({members.length})</h2>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Ajouter un joueur
          </Button>
        )}
      </div>

      {members.length > 8 && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="field pl-10"
            placeholder="Rechercher un joueur…"
            aria-label="Rechercher un joueur"
          />
        </div>
      )}

      {adding && (
        <form onSubmit={addPlayer} className="card p-5 space-y-4 animate-rise-in">
          <p className="text-sm font-bold">Nouveau joueur</p>
          <p className="text-xs text-ink-soft">
            Indiquez son nom : un code d&apos;invitation sera créé, à lui transmettre pour qu&apos;il crée son compte.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="field" placeholder="Prénom" aria-label="Prénom" />
            <input required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="field" placeholder="Nom" aria-label="Nom" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-ink-soft">Poste (optionnel)</p>
            <PositionPicker position={form.position} onChange={(p) => setForm((f) => ({ ...f, position: p }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink-soft" htmlFor="newJersey">N° de maillot (optionnel)</label>
            <input
              id="newJersey"
              type="number"
              min={1}
              max={99}
              value={form.jerseyNumber}
              onChange={(e) => setForm((f) => ({ ...f, jerseyNumber: e.target.value }))}
              className="field w-24"
              placeholder="10"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Annuler</Button>
            <Button type="submit" size="sm" disabled={busy}>Créer le code d&apos;invitation</Button>
          </div>
        </form>
      )}

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}

      {members.length === 0 && !adding && (
        <div className="card p-8 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center mx-auto">
            <Users size={22} />
          </span>
          <p className="text-sm text-ink-soft font-medium">Votre équipe est vide pour l&apos;instant.</p>
          <Button variant="soft" size="sm" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Ajouter mon premier joueur
          </Button>
        </div>
      )}

      {members.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-ink-soft text-center py-6">Aucun joueur ne correspond à « {query} ».</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 items-start">
        {filtered.map((m) => (
          <div key={m.id} className="card p-5 space-y-3 animate-rise-in">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0",
                  m.accountStatus === "active" ? "bg-pitch-deep" : "bg-line text-ink-soft",
                )}
              >
                {m.jerseyNumber ? (
                  <span className="display text-lg">{m.jerseyNumber}</span>
                ) : (
                  <>
                    {m.firstName[0]}
                    {m.lastName[0] ?? ""}
                  </>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">
                  {m.firstName} {m.lastName}
                </p>
                <p className="text-xs text-ink-soft">
                  {m.position ? POSITION_LABELS[m.position] : "Poste non renseigné"}
                  {m.jerseyNumber ? ` · N° ${m.jerseyNumber}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {m.nextMatchStatus && (
                  <span
                    className={cn(
                      "chip",
                      m.nextMatchStatus === "present" && "bg-success-soft text-success",
                      m.nextMatchStatus === "absent" && "bg-coral-soft text-coral",
                      m.nextMatchStatus === "pending" && "bg-sun-soft text-sun",
                    )}
                  >
                    {(() => {
                      const day = m.nextMatchDate
                        ? new Date(`${m.nextMatchDate}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long" })
                        : "";
                      if (m.nextMatchStatus === "present") return `Présent ${day}`;
                      if (m.nextMatchStatus === "absent") return `Absent ${day}`;
                      return "En attente";
                    })()}
                  </span>
                )}
                <button
                  onClick={() => setEditing(editing === m.id ? null : m.id)}
                  className="p-2 rounded-lg text-ink-soft/60 hover:text-ink hover:bg-paper transition"
                  aria-label={`Modifier la fiche de ${m.firstName}`}
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>

            {m.accountStatus === "invited" && (
              <span className="chip bg-sun-soft text-sun">En attente d&apos;inscription</span>
            )}

            {editing === m.id && (
              <EditPlayerForm
                member={m}
                onDone={() => {
                  setEditing(null);
                  load();
                }}
              />
            )}

            {m.accountStatus === "invited" && m.inviteCode && (
              <div className="bg-paper rounded-lg px-4 py-3 space-y-1.5">
                <p className="text-xs font-bold text-ink-soft">Code à transmettre au joueur :</p>
                <CopyCode code={m.inviteCode} />
              </div>
            )}

            {m.accountStatus === "active" && (
              <div className="bg-paper rounded-lg px-4 py-3 space-y-1.5">
                <p className="text-xs font-bold text-ink-soft">Parent</p>
                {m.parentStatus === "linked" && (
                  <span className="chip bg-success-soft text-success">✓ {m.parentName}</span>
                )}
                {m.parentStatus === "invited" && m.parentInviteCode && (
                  <>
                    <p className="text-xs text-ink-soft">Code à transmettre au parent :</p>
                    <CopyCode code={m.parentInviteCode} />
                  </>
                )}
                {m.parentStatus === "none" && (
                  <Button size="sm" onClick={() => inviteParent(m.id)} disabled={busy}>
                    <UserPlus size={14} /> Inviter le parent
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense>
      <TeamContent />
    </Suspense>
  );
}

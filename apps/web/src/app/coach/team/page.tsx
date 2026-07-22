"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, Pencil, RefreshCw, Search, Ticket, UserCheck, Users, X } from "lucide-react";
import type { JoinRequestDto, PlayerPosition, TeamMemberDto } from "@footcoach/shared";
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
        "inline-flex items-center gap-2 font-mono font-black text-lg tracking-[0.25em] rounded-lg px-4 py-2 border transition",
        copied ? "bg-pitch-soft text-pitch-deep border-pitch/30" : "bg-white border-line hover:border-pitch/50",
      )}
      aria-label={`Copier le code ${code}`}
    >
      {code}
      {copied ? <Check size={15} className="text-pitch" /> : <Copy size={15} className="text-ink-soft" />}
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

function EditPlayerForm({ member, onDone }: { member: TeamMemberDto; onDone: () => void }) {
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

// Carte du code d'équipe unique à partager aux joueurs et parents
function JoinCodeCard() {
  const [code, setCode] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ code: string }>("/team/join-code")
      .then((r) => setCode(r.code))
      .catch(() => undefined);
  }, []);

  async function regenerate() {
    setBusy(true);
    try {
      const r = await api<{ code: string }>("/team/join-code/regenerate", { method: "POST" });
      setCode(r.code);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (!code) return null;

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center shrink-0">
          <Ticket size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Code d&apos;équipe</p>
          <p className="text-xs text-ink-soft">
            Partagez ce code unique à vos joueurs et parents : ils s&apos;inscrivent seuls, vous validez leurs demandes ici.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CopyCode code={code} />
        {confirming ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="danger" onClick={regenerate} disabled={busy}>
              {busy ? "…" : "Confirmer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Annuler</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            <RefreshCw size={13} /> Régénérer
          </Button>
        )}
      </div>
      {confirming && (
        <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">
          L&apos;ancien code cessera immédiatement de fonctionner.
        </p>
      )}
    </div>
  );
}

// Demandes d'adhésion en attente de validation
function JoinRequestsCard({
  requests,
  members,
  onDecided,
}: {
  requests: JoinRequestDto[];
  members: TeamMemberDto[];
  onDecided: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [childOverride, setChildOverride] = useState<Record<string, string>>({});

  if (requests.length === 0) return null;

  async function decide(id: string, decision: "approve" | "decline") {
    setBusy(id);
    setError(null);
    try {
      const body =
        decision === "approve" && childOverride[id] ? JSON.stringify({ childUserId: childOverride[id] }) : JSON.stringify({});
      await api(`/team/requests/${id}/${decision}`, { method: "POST", body });
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-5 space-y-3 border-l-4 border-l-gold">
      <div className="flex items-center gap-2">
        <UserCheck size={16} className="text-sun" />
        <p className="text-sm font-black">
          {requests.length} demande{requests.length > 1 ? "s" : ""}{" "}d&apos;adhésion à valider
        </p>
      </div>
      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
      {requests.map((r) => (
        <div key={r.id} className="bg-paper rounded-lg px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-navy-700 text-white flex items-center justify-center text-xs font-black shrink-0">
              {r.firstName[0]}
              {r.lastName[0] ?? ""}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">
                {r.firstName} {r.lastName}
                <span className={cn("chip ml-2", r.role === "player" ? "bg-blue-soft text-blue" : "bg-tangerine-soft text-tangerine")}>
                  {r.role === "player" ? "Joueur" : "Parent"}
                </span>
              </p>
              <p className="text-xs text-ink-soft truncate">
                {r.email}
                {r.role === "player" && r.position && ` · ${POSITION_LABELS[r.position]}`}
                {r.role === "player" && r.jerseyNumber != null && ` · N° ${r.jerseyNumber}`}
              </p>
            </div>
          </div>

          {r.role === "parent" && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink-soft" htmlFor={`child-${r.id}`}>
                Parent de :
              </label>
              <select
                id={`child-${r.id}`}
                value={childOverride[r.id] ?? r.childUserId ?? ""}
                onChange={(e) => setChildOverride((o) => ({ ...o, [r.id]: e.target.value }))}
                className="field"
              >
                <option value="">Choisir le joueur…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                    {m.parentStatus === "linked" ? " (a déjà un parent)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => decide(r.id, "approve")} disabled={busy === r.id}>
              <Check size={14} /> Accepter
            </Button>
            <Button size="sm" variant="danger" onClick={() => decide(r.id, "decline")} disabled={busy === r.id}>
              <X size={14} /> Refuser
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamContent() {
  const params = useSearchParams();
  const welcome = params.get("bienvenue") === "1";
  const [members, setMembers] = useState<TeamMemberDto[] | null>(null);
  const [requests, setRequests] = useState<JoinRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([
        api<TeamMemberDto[]>("/team/members"),
        api<JoinRequestDto[]>("/team/requests"),
      ]);
      setMembers(m);
      setRequests(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          <p className="text-sm text-white/90">Pour constituer votre effectif, en 3 petits pas :</p>
          <ol className="text-sm text-white/90 space-y-1 list-none">
            <li><span className="font-black">1.</span> Copiez le code d&apos;équipe ci-dessous.</li>
            <li><span className="font-black">2.</span> Partagez-le à vos joueurs et à leurs parents (SMS, groupe…).</li>
            <li><span className="font-black">3.</span> Ils s&apos;inscrivent seuls — vous n&apos;avez plus qu&apos;à accepter leurs demandes ici.</li>
          </ol>
        </div>
      )}

      <JoinCodeCard />

      <JoinRequestsCard requests={requests} members={members} onDecided={load} />

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}

      <h2 className="display text-lg px-1">Mon équipe ({members.length})</h2>

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

      {members.length === 0 && (
        <div className="card p-8 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center mx-auto">
            <Users size={22} />
          </span>
          <p className="text-sm text-ink-soft font-medium">Votre équipe est vide pour l&apos;instant.</p>
          <p className="text-xs text-ink-soft">
            Partagez le code d&apos;équipe ci-dessus : vos joueurs s&apos;inscriront en autonomie.
          </p>
        </div>
      )}

      {members.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-ink-soft text-center py-6">Aucun joueur ne correspond à « {query} ».</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 items-start">
        {filtered.map((m) => (
          <div key={m.id} className="card p-5 space-y-3 animate-rise-in">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-pitch-deep flex items-center justify-center text-white text-sm font-black shrink-0">
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

            {editing === m.id && (
              <EditPlayerForm
                member={m}
                onDone={() => {
                  setEditing(null);
                  load();
                }}
              />
            )}

            <div className="bg-paper rounded-lg px-4 py-3 space-y-1.5">
              <p className="text-xs font-bold text-ink-soft">Parent</p>
              {m.parentStatus === "linked" ? (
                <span className="chip bg-success-soft text-success">
                  <Check size={12} /> {m.parentName}
                </span>
              ) : (
                <p className="text-xs text-ink-soft">
                  Aucun parent lié — il peut s&apos;inscrire avec le code d&apos;équipe.
                </p>
              )}
            </div>
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

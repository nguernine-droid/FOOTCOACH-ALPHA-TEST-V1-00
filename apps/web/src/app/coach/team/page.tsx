"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, UserPlus } from "lucide-react";
import type { TeamMemberDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

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
        "inline-flex items-center gap-2 font-mono font-black text-sm tracking-[0.2em] rounded-xl px-3 py-1.5 border transition",
        copied ? "bg-pitch-soft text-pitch-deep border-pitch/30" : "bg-white border-line hover:border-pitch/50",
      )}
      aria-label={`Copier le code ${code}`}
    >
      {code}
      {copied ? <Check size={14} className="text-pitch" /> : <Copy size={14} className="text-ink-soft" />}
    </button>
  );
}

function TeamContent() {
  const params = useSearchParams();
  const welcome = params.get("bienvenue") === "1";
  const [members, setMembers] = useState<TeamMemberDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "" });
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
      await api("/team/invitations", { method: "POST", body: JSON.stringify({ role: "player", ...form }) });
      setForm({ firstName: "", lastName: "" });
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

  if (error && !members) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-2xl px-4 py-3">{error}</p>;
  if (!members) return <p className="text-ink-soft animate-soft-pulse text-sm font-semibold">Chargement…</p>;

  return (
    <div className="space-y-4">
      {welcome && (
        <div className="hero-pitch p-6 space-y-2">
          <h2 className="font-black text-lg">Bienvenue ! 🎉 Votre équipe est créée.</h2>
          <p className="text-sm text-white/90">Voici comment inviter votre effectif, en 3 petits pas :</p>
          <ol className="text-sm text-white/90 space-y-1 list-none">
            <li><span className="font-black">1.</span> Ajoutez un joueur avec le bouton ci-dessous → un code apparaît.</li>
            <li><span className="font-black">2.</span> Transmettez-lui ce code (SMS, papier…) : il crée son compte avec.</li>
            <li><span className="font-black">3.</span> Une fois son compte créé, cliquez « Inviter le parent » sur sa fiche.</li>
          </ol>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black px-1">Mon équipe ({members.length})</h2>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Ajouter un joueur
          </Button>
        )}
      </div>

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
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Annuler</Button>
            <Button type="submit" size="sm" disabled={busy}>Créer le code d&apos;invitation</Button>
          </div>
        </form>
      )}

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}

      {members.length === 0 && !adding && (
        <div className="card p-8 text-center space-y-3">
          <p className="text-3xl" aria-hidden>👥</p>
          <p className="text-sm text-ink-soft font-medium">Votre équipe est vide pour l&apos;instant.</p>
          <Button variant="soft" size="sm" onClick={() => setAdding(true)}>
            <UserPlus size={15} /> Ajouter mon premier joueur
          </Button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 items-start">
        {members.map((m) => (
          <div key={m.id} className="card p-5 space-y-3 animate-rise-in">
            <div className="flex items-center gap-3">
              <span className={cn("w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0", m.accountStatus === "active" ? "bg-sky" : "bg-line text-ink-soft")}>
                {m.firstName[0]}
                {m.lastName[0] ?? ""}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">
                  {m.firstName} {m.lastName}
                </p>
                <span className={cn("chip", m.accountStatus === "active" ? "bg-pitch-soft text-pitch-deep" : "bg-sun-soft text-sun")}>
                  {m.accountStatus === "active" ? "✓ Compte créé" : "En attente d'inscription"}
                </span>
              </div>
            </div>

            {m.accountStatus === "invited" && m.inviteCode && (
              <div className="bg-paper rounded-2xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-bold text-ink-soft">Code à transmettre au joueur :</p>
                <CopyCode code={m.inviteCode} />
              </div>
            )}

            {m.accountStatus === "active" && (
              <div className="bg-paper rounded-2xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-bold text-ink-soft">Parent</p>
                {m.parentStatus === "linked" && (
                  <span className="chip bg-pitch-soft text-pitch-deep">✓ {m.parentName}</span>
                )}
                {m.parentStatus === "invited" && m.parentInviteCode && (
                  <>
                    <p className="text-xs text-ink-soft">Code à transmettre au parent :</p>
                    <CopyCode code={m.parentInviteCode} />
                  </>
                )}
                {m.parentStatus === "none" && (
                  <Button size="sm" variant="soft" onClick={() => inviteParent(m.id)} disabled={busy}>
                    Inviter le parent
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

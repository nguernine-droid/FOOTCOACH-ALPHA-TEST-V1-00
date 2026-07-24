"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Building2, Check, Copy, KeyRound, Mail, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import type { AdminAccountDto, AdminCreateClubResultDto, Role } from "@footcoach/shared";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { timeAgo, useNow } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

const ROLE_META: Record<Role, { label: string; chip: string }> = {
  coach: { label: "Coach", chip: "bg-pitch-soft text-pitch-deep" },
  player: { label: "Joueur", chip: "bg-sky-soft text-sky" },
  parent: { label: "Parent", chip: "bg-tangerine-soft text-tangerine" },
  supporter: { label: "Supporter", chip: "bg-sun-soft text-sun" },
  admin: { label: "Admin", chip: "bg-navy-700 text-white" },
  club: { label: "Club", chip: "bg-navy-100 text-navy-700" },
};

// Modal affichant le mot de passe temporaire — visible UNE seule fois
function TempPasswordModal({ account, password, onClose }: { account: AdminAccountDto; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 bg-navy-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mot de passe temporaire"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-pop max-w-sm w-full p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-black">Mot de passe réinitialisé</h3>
          <p className="text-sm text-ink-soft">
            Transmettez ce mot de passe temporaire à{" "}
            <span className="font-bold">{account.firstName} {account.lastName}</span>. Il ne sera plus affiché ensuite.
          </p>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={cn(
            "w-full flex items-center justify-center gap-2 font-mono font-black text-lg tracking-widest rounded-lg px-4 py-3 border transition",
            copied ? "bg-success-soft text-success border-success/30" : "bg-paper border-line hover:border-blue/40",
          )}
          aria-label="Copier le mot de passe temporaire"
        >
          {password}
          {copied ? <Check size={16} /> : <Copy size={16} className="text-ink-soft" />}
        </button>
        <p className="text-[11px] text-ink-soft">
          Toutes ses sessions ont été déconnectées. Il pourra changer ce mot de passe plus tard.
        </p>
        <Button className="w-full" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
}

function AccountCard({ account, onChanged }: { account: AdminAccountDto; onChanged: () => void }) {
  const now = useNow(60000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(account.email);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = ROLE_META[account.role];
  const manageable = account.role !== "admin";
  const deletable = manageable && account.role !== "coach";

  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("card p-5 space-y-3 animate-rise-in", account.disabled && "opacity-75 border-coral/30")}>
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-navy-700 text-white flex items-center justify-center text-sm font-black shrink-0">
          {account.firstName[0]}
          {account.lastName[0] ?? ""}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate">
            {account.firstName} {account.lastName}
          </p>
          <p className="text-xs text-ink-soft truncate">{account.email}</p>
        </div>
        <span className={cn("chip shrink-0", meta.chip)}>{meta.label}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {account.teamName && <span className="chip bg-paper text-ink-soft">{account.teamName}</span>}
        <span className="chip bg-paper text-ink-soft">
          {account.lastLoginAt ? `Connecté ${timeAgo(account.lastLoginAt, now).toLowerCase()}` : "Jamais connecté"}
        </span>
        {account.disabled && (
          <span className="chip bg-coral-soft text-coral">
            <Ban size={11} /> Désactivé
          </span>
        )}
        {account.hasPendingReset && (
          <span className="chip bg-sun-soft text-sun">
            <KeyRound size={11} /> Réinitialisation demandée
          </span>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}

      {editingEmail && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action(async () => {
              await api(`/admin/accounts/${account.id}/email`, { method: "PATCH", body: JSON.stringify({ email }) });
              setEditingEmail(false);
              onChanged();
            });
          }}
          className="flex gap-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field flex-1"
            aria-label="Nouvel email"
          />
          <Button type="submit" size="sm" disabled={busy}>Enregistrer</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingEmail(false)}>
            <X size={14} />
          </Button>
        </form>
      )}

      {manageable && !editingEmail && (
        <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
          <Button
            size="sm"
            variant={account.hasPendingReset ? "primary" : "soft"}
            disabled={busy}
            onClick={() =>
              action(async () => {
                const { tempPassword: pw } = await api<{ tempPassword: string }>(
                  `/admin/accounts/${account.id}/reset-password`,
                  { method: "POST" },
                );
                setTempPassword(pw);
                onChanged();
              })
            }
          >
            <KeyRound size={13} /> Réinitialiser
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditingEmail(true)}>
            <Mail size={13} /> Email
          </Button>
          {account.disabled ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await api(`/admin/accounts/${account.id}/enable`, { method: "POST" });
                  onChanged();
                })
              }
            >
              <RotateCcw size={13} /> Réactiver
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await api(`/admin/accounts/${account.id}/disable`, { method: "POST" });
                  onChanged();
                })
              }
            >
              <Ban size={13} /> Désactiver
            </Button>
          )}
          {deletable &&
            (confirmDelete ? (
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    await api(`/admin/accounts/${account.id}`, { method: "DELETE" });
                    onChanged();
                  })
                }
              >
                <Trash2 size={13} /> Confirmer la suppression
              </Button>
            ) : (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={13} /> Supprimer
              </Button>
            ))}
          {confirmDelete && (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
          )}
        </div>
      )}

      {tempPassword && (
        <TempPasswordModal account={account} password={tempPassword} onClose={() => setTempPassword(null)} />
      )}
    </div>
  );
}

// Création d'un compte club : formulaire puis identifiants (affichés une fois)
function CreateClubModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", city: "", contactFirstName: "", contactLastName: "", email: "" });
  const [result, setResult] = useState<AdminCreateClubResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<AdminCreateClubResultDto>("/admin/clubs", { method: "POST", body: JSON.stringify(form) });
      setResult(res);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-navy-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Nouveau club"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-pop max-w-md w-full p-6 space-y-4">
        {result ? (
          <>
            <div className="space-y-1">
              <h3 className="text-base font-black">Club créé — {result.club.name}</h3>
              <p className="text-sm text-ink-soft">
                Transmettez ces identifiants au club. Le mot de passe ne sera plus affiché ensuite.
              </p>
            </div>
            <div className="bg-paper rounded-lg px-4 py-3 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Email de connexion</p>
              <p className="text-sm font-bold break-all">{result.ownerEmail}</p>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(result.tempPassword);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={cn(
                "w-full flex items-center justify-center gap-2 font-mono font-black text-lg tracking-widest rounded-lg px-4 py-3 border transition",
                copied ? "bg-success-soft text-success border-success/30" : "bg-paper border-line hover:border-blue/40",
              )}
              aria-label="Copier le mot de passe temporaire"
            >
              {result.tempPassword}
              {copied ? <Check size={16} /> : <Copy size={16} className="text-ink-soft" />}
            </button>
            <p className="text-[11px] text-ink-soft">
              Code d&apos;affiliation du club : <span className="font-mono font-bold">{result.club.affiliationCode}</span>
            </p>
            <Button className="w-full" onClick={onClose}>Fermer</Button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue" />
              <h3 className="text-base font-black">Nouveau club</h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft" htmlFor="club-name">Nom du club</label>
              <input id="club-name" required minLength={2} value={form.name} onChange={(e) => set("name", e.target.value)} className="field" placeholder="Étoile Sportive" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft" htmlFor="club-city">Ville</label>
              <input id="club-city" required value={form.city} onChange={(e) => set("city", e.target.value)} className="field" placeholder="Lyon" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft" htmlFor="club-fn">Prénom du contact</label>
                <input id="club-fn" required value={form.contactFirstName} onChange={(e) => set("contactFirstName", e.target.value)} className="field" placeholder="Camille" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft" htmlFor="club-ln">Nom du contact</label>
                <input id="club-ln" required value={form.contactLastName} onChange={(e) => set("contactLastName", e.target.value)} className="field" placeholder="Direction" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft" htmlFor="club-email">Email de connexion</label>
              <input id="club-email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className="field" placeholder="club@exemple.fr" />
            </div>
            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={busy}>Créer le club</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccountDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creatingClub, setCreatingClub] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccounts(await api<AdminAccountDto[]>("/admin/accounts"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !accounts) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!accounts) return <CardGridSkeleton cards={4} />;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? accounts.filter((a) => `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(q))
    : accounts;
  // Les demandes de réinitialisation en premier
  const sorted = [...filtered].sort((a, b) => Number(b.hasPendingReset) - Number(a.hasPendingReset));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-lg px-1">Comptes ({accounts.length})</h2>
        <Button size="sm" onClick={() => setCreatingClub(true)}>
          <Plus size={14} /> Nouveau club
        </Button>
      </div>

      {creatingClub && <CreateClubModal onClose={() => setCreatingClub(false)} onCreated={load} />}

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field pl-10"
          placeholder="Rechercher par nom ou email…"
          aria-label="Rechercher un compte"
        />
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-ink-soft text-center py-6">Aucun compte ne correspond à « {query} ».</p>
      )}

      <div className="grid gap-3 md:grid-cols-2 items-start">
        {sorted.map((a) => (
          <AccountCard key={a.id} account={a} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, IdCard, ShieldCheck, X } from "lucide-react";
import type { ApprovalDto, UserDto } from "@footcoach/shared";
import { api, getStoredUser, updateStoredUser } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { RoleGuard } from "@/components/RoleGuard";
import { AttendanceList } from "@/components/AttendanceList";
import { Button } from "@/components/ui/Button";

// Infos conducteur : obligatoires avant de pouvoir proposer un covoiturage
function DriverInfoCard({ onSaved }: { onSaved: () => void }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ licensePlate: "", driverLicenseNumber: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await api<UserDto>("/me/driver-info", { method: "PATCH", body: JSON.stringify(form) });
      updateStoredUser(updated);
      setUser(updated);
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  if (user.hasDriverInfo && !editing) {
    return (
      <div className="card p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-pitch-soft text-pitch flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-bold">Infos conducteur validées</p>
            <p className="text-xs text-ink-soft">Vous pouvez proposer du covoiturage sur vos matchs.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Modifier
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-tangerine-soft text-tangerine flex items-center justify-center shrink-0">
          <IdCard size={18} />
        </span>
        <div>
          <p className="text-sm font-bold">Mes infos conducteur</p>
          <p className="text-xs text-ink-soft">Obligatoires pour proposer un covoiturage aux joueurs.</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="plate" className="text-xs font-bold text-ink-soft">Plaque d&apos;immatriculation</label>
          <input
            id="plate"
            required
            value={form.licensePlate}
            onChange={(e) => setForm((f) => ({ ...f, licensePlate: e.target.value }))}
            className="field font-mono uppercase"
            placeholder="AB-123-CD"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="license" className="text-xs font-bold text-ink-soft">N° de permis de conduire</label>
          <input
            id="license"
            required
            value={form.driverLicenseNumber}
            onChange={(e) => setForm((f) => ({ ...f, driverLicenseNumber: e.target.value }))}
            className="field font-mono uppercase"
            placeholder="123456789012"
          />
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
      <div className="flex gap-2 justify-end">
        {editing && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Annuler
          </Button>
        )}
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

// Demandes de covoiturage des joueurs dont je suis le parent assigné
function ApprovalsCard({ version, onDecided }: { version: number; onDecided: () => void }) {
  const [approvals, setApprovals] = useState<ApprovalDto[] | null>(null);

  const load = useCallback(async () => {
    try {
      setApprovals(await api<ApprovalDto[]>("/me/approvals"));
    } catch {
      setApprovals([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  async function decide(id: string, decision: "approve" | "decline") {
    await api(`/bookings/${id}/${decision}`, { method: "POST" });
    load();
    onDecided();
  }

  const pending = approvals?.filter((a) => a.status === "pending") ?? [];
  const decided = approvals?.filter((a) => a.status !== "pending") ?? [];
  if (!approvals || approvals.length === 0) return null;

  return (
    <div className="card p-5 space-y-3">
      <p className="text-sm font-bold">Autorisations de covoiturage</p>
      {pending.length === 0 && <p className="text-xs text-ink-soft">Aucune demande en attente.</p>}
      {pending.map((a) => (
        <div key={a.id} className="bg-sun-soft/60 rounded-2xl px-4 py-3 space-y-2.5">
          <p className="text-sm">
            <span className="font-bold">{a.playerName}</span> souhaite monter dans la voiture de{" "}
            <span className="font-bold">{a.driverName}</span>
            {a.licensePlate && <span className="font-mono text-xs bg-white border border-line rounded px-1.5 py-0.5 ml-1.5">{a.licensePlate}</span>}
          </p>
          <p className="text-xs text-ink-soft capitalize">
            {a.matchLabel} · {formatDate(a.matchDate)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => decide(a.id, "approve")}>
              <Check size={14} /> J&apos;autorise
            </Button>
            <Button size="sm" variant="danger" onClick={() => decide(a.id, "decline")}>
              <X size={14} /> Je refuse
            </Button>
          </div>
        </div>
      ))}
      {decided.map((a) => (
        <p key={a.id} className="text-xs font-semibold text-ink-soft bg-paper rounded-2xl px-4 py-2.5">
          {a.status === "approved" ? "✅" : "❌"} {a.playerName} → voiture de {a.driverName} ({a.matchLabel})
        </p>
      ))}
    </div>
  );
}

export default function ParentPage() {
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  return (
    <RoleGuard role="parent">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <DriverInfoCard onSaved={bump} />
          <ApprovalsCard version={version} onDecided={bump} />
        </div>
        <h2 className="text-sm font-black px-1 pt-2">Les matchs de l&apos;équipe</h2>
        <AttendanceList key={version} parentMode />
      </div>
    </RoleGuard>
  );
}

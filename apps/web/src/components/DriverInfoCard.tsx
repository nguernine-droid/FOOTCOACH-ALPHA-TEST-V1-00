"use client";

import { useEffect, useState } from "react";
import { IdCard, ShieldCheck } from "lucide-react";
import type { UserDto } from "@footcoach/shared";
import { api, getStoredUser, updateStoredUser } from "@/lib/api";
import { Button } from "@/components/ui/Button";

// Infos conducteur : obligatoires avant de pouvoir proposer un covoiturage
export function DriverInfoCard({ onSaved }: { onSaved: () => void }) {
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
          <span className="w-10 h-10 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center shrink-0">
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
        <span className="w-10 h-10 rounded-lg bg-tangerine-soft text-tangerine flex items-center justify-center shrink-0">
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

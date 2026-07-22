"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { ApprovalDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AttendanceList } from "@/components/AttendanceList";
import { DriverInfoCard } from "@/components/DriverInfoCard";
import { Button } from "@/components/ui/Button";

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
        <div key={a.id} className="bg-sun-soft/60 rounded-lg px-4 py-3 space-y-2.5">
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
        <p key={a.id} className="text-xs font-semibold text-ink-soft bg-paper rounded-lg px-4 py-2.5">
          {a.status === "approved" ? "Autorisé" : "Refusé"} · {a.playerName}, voiture de {a.driverName} ({a.matchLabel})
        </p>
      ))}
    </div>
  );
}

export default function ParentPage() {
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <DriverInfoCard onSaved={bump} />
        <ApprovalsCard version={version} onDecided={bump} />
      </div>
      <h2 className="text-sm font-black px-1 pt-2">Les matchs de l&apos;équipe</h2>
      <AttendanceList key={version} parentMode />
    </div>
  );
}

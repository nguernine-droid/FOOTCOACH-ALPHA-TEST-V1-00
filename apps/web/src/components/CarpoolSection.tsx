"use client";

import { useCallback, useEffect, useState } from "react";
import { Car, Clock, X } from "lucide-react";
import type { CarpoolDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

// Voitures proposées pour un match.
// canBook (joueur) : permet de réserver une place / annuler sa réservation.
export function CarpoolSection({
  matchId,
  canBook,
  onChange,
}: {
  matchId: string;
  canBook: boolean;
  onChange?: () => void;
}) {
  const [carpools, setCarpools] = useState<CarpoolDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCarpools(await api<CarpoolDto[]>(`/matches/${matchId}/carpools`));
    } catch {
      setCarpools([]);
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function book(driverId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/matches/${matchId}/carpools/${driverId}/book`, { method: "POST" });
      await load();
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Réservation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(bookingId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/bookings/${bookingId}`, { method: "DELETE" });
      await load();
      onChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annulation impossible");
    } finally {
      setBusy(false);
    }
  }

  if (!carpools || carpools.length === 0) return null;

  const myActiveBooking = carpools.find((c) => c.myBooking);

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-ink flex items-center gap-1.5">
        <Car size={14} className="text-tangerine" /> Covoiturages proposés
      </p>
      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-xl px-3 py-2">{error}</p>}
      {carpools.map((c) => (
        <div
          key={c.driverId}
          className={cn("bg-paper rounded-lg px-4 py-3 space-y-2", c.seatsRemaining === 0 && "opacity-70")}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate flex items-center gap-2">
                Voiture de {c.driverName}
                {c.seatsRemaining === 0 && <span className="chip bg-line text-ink-soft">Complet</span>}
              </p>
              {(c.departureTime || c.departureArea) && (
                <p className="text-[11px] font-semibold text-ink">
                  Départ{c.departureTime && ` ${c.departureTime}`}
                  {c.departureArea && ` · ${c.departureArea}`}
                </p>
              )}
              <p className="text-[11px] text-ink-soft">
                {c.licensePlate && <span className="font-mono bg-white border border-line rounded px-1.5 py-0.5 mr-2">{c.licensePlate}</span>}
                {c.seatsRemaining}/{c.seatsTotal} place{c.seatsTotal > 1 ? "s" : ""} libre{c.seatsRemaining > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-1" aria-hidden>
              {Array.from({ length: c.seatsTotal }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    i < c.seatsTotal - c.seatsRemaining ? "bg-tangerine" : "bg-white border border-line",
                  )}
                />
              ))}
            </div>
          </div>

          {c.bookings.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {c.bookings.map((b) => (
                <span
                  key={b.id}
                  className={cn(
                    "chip",
                    b.status === "approved" ? "bg-success-soft text-success" : "bg-sun-soft text-sun",
                  )}
                >
                  {b.playerName}
                  {b.status === "pending" && <Clock size={11} />}
                </span>
              ))}
            </div>
          )}

          {canBook &&
            (c.myBooking ? (
              <div className="flex items-center justify-between gap-2">
                <span className={cn("chip", c.myBooking.status === "approved" ? "bg-success-soft text-success" : "bg-sun-soft text-sun")}>
                  {c.myBooking.status === "approved" ? "Place confirmée" : "En attente de l'accord parental"}
                </span>
                <button
                  onClick={() => cancel(c.myBooking!.id)}
                  disabled={busy}
                  className="text-xs font-bold text-ink-soft hover:text-coral inline-flex items-center gap-1 transition"
                >
                  <X size={13} /> Annuler
                </button>
              </div>
            ) : (
              !myActiveBooking &&
              c.seatsRemaining > 0 && (
                <Button size="sm" variant="soft" className="w-full" onClick={() => book(c.driverId)} disabled={busy}>
                  <Car size={14} /> Réserver une place
                </Button>
              )
            ))}
        </div>
      ))}
    </div>
  );
}

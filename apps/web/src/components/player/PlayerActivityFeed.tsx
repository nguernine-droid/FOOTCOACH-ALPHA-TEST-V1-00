"use client";

import { useEffect, useState } from "react";
import { Car, UserCheck } from "lucide-react";
import type { ActivityDto } from "@footcoach/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { timeAgo, useNow } from "@/lib/time";

/** Fil léger des dernières activités de l'équipe (présences, covoiturages) */
export function PlayerActivityFeed() {
  const now = useNow(30000);
  const [activity, setActivity] = useState<ActivityDto[] | null>(null);

  useEffect(() => {
    api<ActivityDto[]>("/activity")
      .then((events) => setActivity(events.slice(0, 5)))
      .catch(() => setActivity([]));
  }, []);

  if (!activity || activity.length === 0) return null;

  return (
    <section className="card p-5 space-y-3 animate-rise-in" aria-label="Activités récentes">
      <h3 className="text-sm font-black">Activités récentes</h3>
      <ul className="space-y-2.5">
        {activity.map((ev) => (
          <li key={ev.id} className="flex items-start gap-2.5 text-xs">
            <span
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                ev.type === "attendance" ? "bg-success-soft text-success" : "bg-blue-soft text-blue",
              )}
            >
              {ev.type === "attendance" ? <UserCheck size={13} /> : <Car size={13} />}
            </span>
            <div className="min-w-0">
              <p className="text-ink leading-snug">
                <span className="font-bold">{ev.actor}</span> {ev.detail}
              </p>
              <p className="text-[10px] text-ink-faint font-semibold">{timeAgo(ev.createdAt, now)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

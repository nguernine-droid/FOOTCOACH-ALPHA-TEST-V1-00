"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { AttendanceList } from "@/components/AttendanceList";

export default function PlayerPage() {
  return (
    <RoleGuard role="player">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4">Les matchs de mon équipe</h2>
      <AttendanceList parentMode={false} />
    </RoleGuard>
  );
}

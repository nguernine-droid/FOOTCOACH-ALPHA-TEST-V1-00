"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { AttendanceList } from "@/components/AttendanceList";

export default function PlayerPage() {
  return (
    <RoleGuard role="player">
      <h2 className="text-sm font-black px-1 mb-3">Les matchs de mon équipe</h2>
      <AttendanceList parentMode={false} />
    </RoleGuard>
  );
}

"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { AttendanceList } from "@/components/AttendanceList";

export default function ParentPage() {
  return (
    <RoleGuard role="parent">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4">Les matchs de l&apos;équipe</h2>
      <AttendanceList parentMode />
    </RoleGuard>
  );
}

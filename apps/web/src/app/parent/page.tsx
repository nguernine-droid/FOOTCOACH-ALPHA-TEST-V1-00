"use client";

import { RoleGuard } from "@/components/RoleGuard";
import { AttendanceList } from "@/components/AttendanceList";

export default function ParentPage() {
  return (
    <RoleGuard role="parent">
      <h2 className="text-sm font-black px-1 mb-3">Les matchs de l&apos;équipe</h2>
      <AttendanceList parentMode />
    </RoleGuard>
  );
}

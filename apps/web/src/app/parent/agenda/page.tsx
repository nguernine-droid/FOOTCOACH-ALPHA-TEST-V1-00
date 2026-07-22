"use client";

import { CalendarRange } from "lucide-react";

export default function ParentAgendaPage() {
  return (
    <div className="max-w-[720px] mx-auto card p-10 text-center space-y-3">
      <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
        <CalendarRange size={22} />
      </span>
      <p className="text-sm font-bold">Agenda de l&apos;équipe</p>
      <p className="text-xs text-ink-soft">Bientôt disponible.</p>
    </div>
  );
}

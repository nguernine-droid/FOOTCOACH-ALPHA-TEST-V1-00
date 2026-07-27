"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AgendaView } from "@/components/agenda/AgendaView";

/** ?nouveau=1 (bouton « + » de la barre d'onglets) ouvre le formulaire, puis le paramètre est retiré */
function CoachAgenda() {
  const router = useRouter();
  const params = useSearchParams();
  const requestCreate = params.get("nouveau") === "1";

  useEffect(() => {
    if (requestCreate) router.replace("/coach/agenda");
  }, [requestCreate, router]);

  return <AgendaView role="coach" requestCreate={requestCreate} />;
}

export default function CoachAgendaPage() {
  return (
    <Suspense fallback={null}>
      <CoachAgenda />
    </Suspense>
  );
}

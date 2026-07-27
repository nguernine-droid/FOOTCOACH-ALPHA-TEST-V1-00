"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Le radar vit désormais dans le tableau de bord — cette route y renvoie. */
export default function RadarPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/coach");
  }, [router]);
  return null;
}

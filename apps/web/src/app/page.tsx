"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, homeForRole } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = getStoredUser();
    router.replace(user ? homeForRole(user.role) : "/login");
  }, [router]);
  return (
    <div className="min-h-dvh flex items-center justify-center text-ink-soft animate-soft-pulse font-bold">⚽ FOOTCOACH</div>
  );
}

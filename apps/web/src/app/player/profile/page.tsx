"use client";

import { ProfileCard } from "@/components/ProfileCard";

export default function PlayerProfilePage() {
  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <h2 className="display text-lg px-1">Mon profil</h2>
      <ProfileCard />
    </div>
  );
}

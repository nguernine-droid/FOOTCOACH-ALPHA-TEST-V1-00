"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bug, ChevronRight, CircleUserRound, Palette, Settings } from "lucide-react";
import type { UserDto } from "@footcoach/shared";
import { api, getStoredUser, updateStoredUser } from "@/lib/api";
import { CalendarSyncCard } from "@/components/coach/CalendarSyncCard";
import { NotificationsCard } from "@/components/coach/NotificationsCard";
import { ThemePicker } from "@/components/ThemePicker";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Réglages de l'application, rassemblés hors de la feuille « Moi ».
 *
 * Celle-ci mélangeait des destinations (mes annonces, mes relations) et des
 * réglages (apparence, profil) ; les seconds y prenaient la place des
 * premières, alors qu'on ne les ouvre presque jamais. Ils vivent donc ici, à un
 * seul geste de la feuille, et elle retrouve sa vocation : aller quelque part.
 */
export default function CoachSettingsPage() {
  const [user, setUser] = useState<UserDto | null>(() => getStoredUser());

  // La session stockée peut dater d'avant les préférences de notification :
  // c'est cette page qui les règle, elle doit partir de l'état réel.
  useEffect(() => {
    api<UserDto>("/me")
      .then((fresh) => {
        setUser(fresh);
        updateStoredUser(fresh);
      })
      .catch(() => undefined);
  }, []);

  /** Une fiche à jour se range aussi dans la session, comme au profil */
  function apply(updated: UserDto) {
    setUser(updated);
    updateStoredUser(updated);
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Settings size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Paramètres</h2>
          <p className="text-xs text-white/85">L&apos;apparence, les notifications, votre profil.</p>
        </div>
      </div>

      {/* L'apparence en tête : c'est le seul réglage dont on voit l'effet sans
          quitter l'écran, et celui qu'on vient régler le premier. */}
      <section className="card p-5 space-y-3" aria-label="Apparence">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
            <Palette size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="display text-lg">Apparence</h3>
            <p className="text-xs text-ink-soft">Clair, sombre, ou celle de votre téléphone.</p>
          </div>
        </div>
        <ThemePicker />
      </section>

      {/* Les notifications viennent d'ici et non plus de « Mon profil » : ce
          sont des réglages de l'application sur CET appareil, pas des
          informations sur le coach. */}
      {user ? <NotificationsCard user={user} onChange={apply} /> : <Skeleton className="h-48 rounded-card" />}

      {/* La liaison au calendrier du téléphone : même famille que les
          notifications — un réglage de CET appareil, pas du profil. */}
      <CalendarSyncCard />

      <LinkCard
        href="/coach/profile"
        icon={<CircleUserRound size={18} />}
        title="Mon profil"
        hint="Votre surnom, votre photo, votre position, vos casquettes et votre code coach."
      />

      <LinkCard
        href="/coach/feedback/new"
        icon={<Bug size={18} />}
        title="Signaler un bug ou une suggestion"
        hint="Reçu directement par l'équipe FootCoach, qui triage chaque envoi."
      />
    </div>
  );
}

function LinkCard({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link href={href} className="card p-5 flex items-center gap-3 transition hover:bg-blue-faint active:bg-blue-soft">
      <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-xs text-ink-soft">{hint}</span>
      </span>
      <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
    </Link>
  );
}

"use client";

import { Megaphone } from "lucide-react";
import { MyAnnouncementsList, useMyAnnouncements } from "@/components/announcements/MyAnnouncements";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Ce que J'AI publié — annonces de match et tournois que j'organise, dans trois
 * casiers.
 *
 * S'ouvre depuis la feuille « Moi › Mes annonces ». Trancher une proposition
 * reçue se fait désormais dans la messagerie (le fil ouvert dès qu'un coach
 * propose de jouer), pas ici : cette page ne fait plus que lister.
 */
export default function MyAnnouncementsPage() {
  const mine = useMyAnnouncements();

  return (
    <div className="space-y-4">
      <div className="hero-pitch p-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Megaphone size={22} />
        </span>
        <div className="min-w-[14rem] flex-1">
          <h2 className="display text-lg">Mes annonces</h2>
          <p className="text-xs text-white/80">
            Ce que vous avez publié : vos recherches d&apos;adversaire et les tournois que vous organisez.
          </p>
        </div>
        <ButtonLink href="/coach/announcements/new" variant="accent" className="shrink-0 w-full sm:w-auto">
          <Megaphone size={14} /> Publier une annonce
        </ButtonLink>
      </div>

      <MyAnnouncementsList mine={mine} />
    </div>
  );
}

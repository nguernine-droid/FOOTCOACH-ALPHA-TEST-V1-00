"use client";

import { Megaphone } from "lucide-react";
import { MyPublicationsList, useMyPublications } from "@/components/announcements/MyPublications";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Ce que J'AI publié — annonces de match et tournois que j'organise, dans trois
 * casiers.
 *
 * La même matière s'ouvre désormais depuis la troisième catégorie de l'onglet
 * « Annonces » : cette page reste le lien direct de la feuille « Moi », avec
 * son bandeau, mais elle ne tient plus la logique — voir `MyPublications`.
 */
export default function MyAnnouncementsPage() {
  const publications = useMyPublications();

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

      <MyPublicationsList publications={publications} />
    </div>
  );
}

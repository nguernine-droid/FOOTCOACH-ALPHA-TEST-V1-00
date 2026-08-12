"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Megaphone } from "lucide-react";
import { MyAnnouncementsList, useMyAnnouncements } from "@/components/announcements/MyAnnouncements";
import { ResponseDecisionSheet } from "@/components/announcements/ResponseDecisionSheet";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Ce que J'AI publié — annonces de match et tournois que j'organise, dans trois
 * casiers.
 *
 * S'ouvre depuis la feuille « Moi › Mes annonces », et par les notifications :
 * `?proposition=<id>` (notification « une équipe veut jouer votre annonce »,
 * fil d'activité) ouvre la feuille de décision — carte du coach répondant et
 * oui/non — dès que les annonces sont chargées. La troisième catégorie de
 * l'onglet « Annonces » est occupée par les publications des contributeurs —
 * les annonces d'un coach, elles, se retrouvent ici. La logique vit dans
 * `MyAnnouncements`, partagée à l'époque où l'onglet la montrait aussi.
 */
function MyAnnouncementsContent() {
  const mine = useMyAnnouncements();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("proposition");
  // Copié en état AVANT de nettoyer l'URL : les annonces arrivent après, et la
  // feuille ne peut s'ouvrir qu'une fois la proposition retrouvée dedans.
  const [openResponseId, setOpenResponseId] = useState<string | null>(null);

  useEffect(() => {
    if (!requested) return;
    setOpenResponseId(requested);
    router.replace("/coach/announcements/mine");
  }, [requested, router]);

  const opened = (() => {
    if (!openResponseId || !mine.announcements) return null;
    for (const a of mine.announcements) {
      const r = a.responses.find((resp) => resp.id === openResponseId);
      if (r) return { announcement: a, response: r };
    }
    return null;
  })();

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

      {opened && (
        <ResponseDecisionSheet
          announcement={opened.announcement}
          response={opened.response}
          onAccept={mine.accept}
          onDecline={mine.decline}
          onClose={() => setOpenResponseId(null)}
        />
      )}
    </div>
  );
}

export default function MyAnnouncementsPage() {
  // `useSearchParams` impose sa frontière Suspense (même règle que l'agenda)
  return (
    <Suspense fallback={null}>
      <MyAnnouncementsContent />
    </Suspense>
  );
}

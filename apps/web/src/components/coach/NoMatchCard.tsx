"use client";

import { PitchPlanner } from "@/components/illustrations/PitchPlanner";
import { ButtonLink } from "@/components/ui/Button";

/**
 * « Aucun match programmé ».
 *
 * La carte de mise en avant du tableau de bord : c'est le premier écran d'un
 * coach sans match, il doit y voir tout de suite ce qu'il peut faire.
 *
 * Elle se détache par l'élévation et un liseré d'accent, jamais en changeant
 * de camp : sombre sur fond sombre, claire sur fond clair. Une carte blanche
 * au milieu d'un écran de nuit se voit, mais elle éblouit et rompt l'unité de
 * l'écran. C'est `.card-spotlight` qui porte la nuance ; le composant, lui,
 * est le même dans les deux thèmes.
 *
 * D'où l'illustration à la place de la petite icône d'avant : une pastille de
 * 48 px ne pesait pas assez pour porter le seul appel à l'action de l'écran.
 */
export function NoMatchCard() {
  return (
    <section className="card card-spotlight p-8 text-center animate-rise-in" aria-label="Aucun match programmé">
      <PitchPlanner className="mx-auto h-[140px] w-auto max-w-full" />

      <h2 className="section-title mt-4 text-[22px] text-spotlight-ink">Aucun match programmé</h2>

      {/* Trois lignes tenues par une largeur maximale plutôt que par des sauts
          forcés : le texte se recompose proprement quelle que soit la fonte. */}
      <p className="mx-auto mt-3 max-w-[30ch] text-sm leading-relaxed text-spotlight-muted">
        Il n&apos;y a pas encore d&apos;adversaires pour votre équipe. Prenez les devants et publiez une annonce
        pour planifier votre prochain duel.
      </p>

      <ButtonLink href="/coach/announcements/new" variant="cta" size="xl" className="mt-6 w-full">
        Publier une annonce
      </ButtonLink>
    </section>
  );
}

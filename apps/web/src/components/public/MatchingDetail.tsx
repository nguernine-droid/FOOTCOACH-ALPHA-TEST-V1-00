import { SectionHeading, VCard } from "@/components/public/primitives";
import { Reveal } from "@/components/public/Reveal";

/**
 * Le rapprochement, montré plutôt qu'expliqué.
 *
 * Deux calendriers posés l'un sous l'autre, et la colonne où les deux équipes
 * sont libres le même jour. C'est TOUT ce que la section doit faire passer :
 * on ne publie pas une petite annonce en espérant qu'on passe devant, c'est le
 * croisement de deux disponibilités qui déclenche la proposition.
 *
 * Une seule idée, un seul visuel. Un second graphique à côté (la distance, les
 * catégories) diluerait celui-ci sans rien ajouter que le texte ne dise déjà.
 */

/** Les cinq dimanches à venir. `free` = l'équipe a coché la date. */
const SUNDAYS = ["5 oct.", "12 oct.", "19 oct.", "26 oct.", "2 nov."];
const MINE = [false, true, false, true, false];
const THEIRS = [true, true, false, false, true];

export function MatchingDetail() {
  return (
    <>
      <Reveal>
        <SectionHeading
          eyebrow="Le rapprochement"
          title={
            <>
              Deux calendriers qui <span className="v-word">se croisent</span>.
            </>
          }
          lead="Vous cochez vos dimanches libres. En face, un autre coach coche les siens. Là où les deux se superposent, TeamNexus propose le match — sans que personne n'ait rien cherché."
        />
      </Reveal>

      <Reveal delay={80}>
        <VCard className="p-6 md:p-10 mt-12 overflow-hidden">
          {/* Le tableau est décoratif : ce qu'il illustre est écrit juste
              au-dessus, et le résumé sous la grille le redit en une phrase. */}
          <div className="space-y-4" aria-hidden>
            <CalendarRow label="Votre équipe" days={MINE} />

            {/* La colonne commune, tirée d'un calendrier à l'autre. C'est le
                seul trait de toute la section : il doit se voir, sinon la
                superposition ne se lit plus et il ne reste que deux rangées de
                pastilles sans rapport. */}
            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {SUNDAYS.map((day, i) => (
                <div key={day} className="h-10 flex flex-col items-center justify-center gap-1">
                  {MINE[i] && THEIRS[i] && (
                    <>
                      <span className="w-0.5 flex-1 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: "var(--accent)", boxShadow: "0 0 12px var(--v-halo-edge)" }}
                      />
                      <span className="w-0.5 flex-1 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                    </>
                  )}
                </div>
              ))}
            </div>

            <CalendarRow label="AS Voisine U13" days={THEIRS} />

            <div className="grid grid-cols-5 gap-2 md:gap-3 pt-1">
              {SUNDAYS.map((day, i) => (
                <p
                  key={day}
                  className={`text-center text-[10px] md:text-[11px] font-bold ${
                    MINE[i] && THEIRS[i] ? "text-accent" : "text-muted"
                  }`}
                >
                  {day}
                </p>
              ))}
            </div>
          </div>

          <p className="mt-8 text-sm text-secondary leading-relaxed max-w-[55ch]">
            Un seul dimanche tombe en commun — le 12 octobre. C&apos;est celui-là qui remonte, avec la distance
            jusqu&apos;au terrain et la catégorie en face. Les quatre autres ne vous sont jamais montrés.
          </p>
        </VCard>
      </Reveal>
    </>
  );
}

function CalendarRow({ label, days }: { label: string; days: boolean[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <div className="grid grid-cols-5 gap-2 md:gap-3">
        {days.map((free, i) => (
          <span
            key={i}
            className="h-11 md:h-14 rounded-[var(--v-radius-chip)] border flex items-center justify-center text-[11px] font-bold"
            style={
              free
                ? {
                    backgroundColor: "var(--accent-surface)",
                    borderColor: "var(--v-halo-edge)",
                    color: "var(--accent)",
                  }
                : {
                    backgroundColor: "var(--v-surface-1)",
                    borderColor: "var(--v-rim-soft)",
                    color: "var(--text-muted)",
                  }
            }
          >
            {free ? "Libre" : "—"}
          </span>
        ))}
      </div>
    </div>
  );
}

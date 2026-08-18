import { Check, X } from "lucide-react";
import { SectionHeading, VCard } from "@/components/public/primitives";
import { Reveal } from "@/components/public/Reveal";

/**
 * La section qui vend : ce que le jeudi soir coûte aujourd'hui, en face de ce
 * qu'il devient.
 *
 * Rien d'inventé dans la colonne de gauche — ce sont les phrases que les coachs
 * emploient eux-mêmes, et chaque ligne de droite correspond à une
 * fonctionnalité qui existe vraiment. Une comparaison qui promettrait une
 * chose de plus que le produit ne tient serait démentie au premier bord de
 * terrain, et le foot amateur est un petit monde.
 */

const BEFORE = [
  "Vingt coups de fil, et autant de messages sans réponse.",
  "Trois groupes WhatsApp où l'information se perd entre deux photos.",
  "Un adversaire qui se désiste le samedi — et personne pour le remplacer.",
  "Le dimanche sans match, annoncé aux joueurs la veille au soir.",
  "Le numéro du vestiaire redemandé par SMS, dix minutes avant le coup d'envoi.",
];

const AFTER = [
  "Vos dates libres déclarées une fois, en trente secondes.",
  "Les équipes compatibles proposées d'elles-mêmes, à la bonne distance.",
  "Un SOS qui alerte les coachs jokers du secteur dans la minute.",
  "Deux reconfirmations, à J-7 puis J-3 : un silence se voit une semaine avant.",
  "Heure, stade, arbitre et vestiaires envoyés aux deux clubs la veille.",
];

export function BeforeAfter() {
  return (
    <>
      <Reveal>
        <SectionHeading
          eyebrow="Avant / après"
          title={
            <>
              Le jeudi soir, <span className="v-word">autrement</span>.
            </>
          }
          lead="Trouver un adversaire n'est que la moitié du problème. L'autre moitié, c'est tout ce qui se passe entre l'accord de principe et le coup d'envoi."
        />
      </Reveal>

      <div className="grid gap-5 md:grid-cols-2 mt-12">
        <Reveal>
          <VCard className="p-6 md:p-8 h-full">
            <h3 className="display text-xl text-secondary">Aujourd&apos;hui</h3>
            <ul className="mt-6 space-y-4">
              {BEFORE.map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-secondary leading-relaxed">
                  <span
                    className="w-5 h-5 rounded-full bg-danger-surface text-danger flex items-center justify-center shrink-0 mt-px"
                    aria-hidden
                  >
                    <X size={12} strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </VCard>
        </Reveal>

        <Reveal delay={80}>
          {/* La colonne de droite porte le liseré d'accent : c'est la seule des
              deux qu'on veut lire en entier. */}
          <VCard className="p-6 md:p-8 h-full border-[var(--v-halo-edge)]">
            <h3 className="display text-xl text-primary">Avec TeamNexus</h3>
            <ul className="mt-6 space-y-4">
              {AFTER.map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-primary leading-relaxed">
                  <span
                    className="w-5 h-5 rounded-full bg-success-surface text-success flex items-center justify-center shrink-0 mt-px"
                    aria-hidden
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </VCard>
        </Reveal>
      </div>
    </>
  );
}

import {
  categoryLabel,
  DIVISION_LEVEL_LABELS,
  MATCH_GENDER_LABELS,
  type PublicAnnouncementDto,
} from "@teamnexus/shared";
import { Pill, VCard } from "@/components/public/primitives";

/** « 2026-10-11 » → « dimanche 11 octobre » */
export function formatPublicDate(iso: string): string {
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * Une annonce, telle qu'un visiteur SANS COMPTE la voit.
 *
 * Partagée par l'aperçu (`/f`) et les pages de département (`/f/…`) : les deux
 * montrent exactement la même chose, et les laisser diverger produirait deux
 * présentations du même objet — celle qu'on corrige et celle qu'on oublie.
 *
 * Ce qui n'y figure pas n'est pas un oubli : ni stade exact, ni commentaire, ni
 * identité de coach. Le serveur ne les envoie pas (voir `PublicAnnouncementDto`
 * côté API), et cette carte ne pourrait donc pas les afficher même si on le lui
 * demandait — c'est la bonne façon de garantir une règle de confidentialité.
 */
export function PublicAnnouncementCard({ announcement: a }: { announcement: PublicAnnouncementDto }) {
  return (
    <VCard as="li" lift className="p-5 space-y-3 list-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-sm text-primary truncate">{a.teamName}</p>
          <p className="text-xs text-muted">{a.city}</p>
        </div>
        {a.isSos && (
          <span
            className="v-chip shrink-0"
            style={{ backgroundColor: "var(--danger-surface)", color: "var(--danger)", borderColor: "transparent" }}
          >
            Place libérée
          </span>
        )}
      </div>

      <p className="text-xs text-secondary capitalize">
        {formatPublicDate(a.date)} à {a.time}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Pill accent>{categoryLabel(a.category)}</Pill>
        {a.gender && <Pill>{MATCH_GENDER_LABELS[a.gender]}</Pill>}
        <Pill>{a.format}</Pill>
        {a.level && <Pill>{DIVISION_LEVEL_LABELS[a.level]}</Pill>}
        {a.slotsLeft !== null && a.slotsLeft > 0 && (
          <Pill accent>
            Plateau · {a.slotsLeft} place{a.slotsLeft > 1 ? "s" : ""}
          </Pill>
        )}
      </div>
    </VCard>
  );
}

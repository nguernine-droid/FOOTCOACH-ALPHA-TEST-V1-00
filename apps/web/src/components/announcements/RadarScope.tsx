"use client";

import type { AnnouncementDto } from "@footcoach/shared";
import { JerseyPin } from "@/components/announcements/mapArt";
import { cn } from "@/lib/utils";

/** Rayons proposés, en km. `null` = aucune limite.
 *  Libellés courts : quatre pastilles doivent tenir sur 390 px sans tronquer. */
export const RADIUS_OPTIONS: { value: number | null; label: string }[] = [
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: null, label: "Illimité" },
];

export type Blip = {
  /**
   * Annonces qui tombent exactement au même endroit — même ville, donc même
   * distance et même relèvement. Un seul maillot les porte, avec leur nombre.
   */
  announcements: AnnouncementDto[];
  /** 0 au centre, 1 sur le cercle extérieur */
  radius: number;
  bearing: number;
};

/**
 * Place les annonces sur la carte à partir de leur distance et de leur
 * relèvement. Les annonces sans coordonnées (ville absente de l'annuaire) sont
 * écartées : mieux vaut ne pas les afficher que les afficher au mauvais endroit.
 *
 * Les clubs d'une même ville partagent des coordonnées à la virgule près : les
 * placer un par un les empilait au pixel près, et la carte d'un secteur dense
 * n'affichait qu'un marqueur là où il y avait huit équipes. On les réunit sous
 * un marqueur compté plutôt que de les disperser — un marqueur déplacé
 * mentirait sur la direction, ce que cet écran ne fait jamais.
 */
export function toBlips(announcements: AnnouncementDto[], scaleKm: number): Blip[] {
  const groups = new Map<string, Blip>();
  for (const a of announcements) {
    if (a.distanceKm === null || a.bearingDeg === null) continue;
    // Plancher à 8 % : les annonces de ma propre ville se poseraient sinon
    // exactement sur le point « moi ».
    const radius = Math.min(1, Math.max(0.08, a.distanceKm / scaleKm));
    const key = `${radius.toFixed(4)}|${a.bearingDeg.toFixed(1)}`;
    const group = groups.get(key);
    if (group) group.announcements.push(a);
    else groups.set(key, { announcements: [a], radius, bearing: a.bearingDeg });
  }
  return [...groups.values()];
}

/** Coordonnées en pourcentage du cadre de la carte, nord en haut, sens horaire */
function position(bearing: number, radius: number) {
  const rad = (bearing * Math.PI) / 180;
  return {
    left: `${50 + 50 * radius * Math.sin(rad)}%`,
    top: `${50 - 50 * radius * Math.cos(rad)}%`,
  };
}

/** Repères cardinaux, posés sur le pourtour du cadre */
const CARDINALS = [
  { label: "N", cls: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
  { label: "E", cls: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2" },
  { label: "S", cls: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2" },
  { label: "O", cls: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" },
] as const;

/**
 * Carte des matchs proches : les cercles de portée, un cône qui balaie la
 * zone, et un maillot par équipe qui cherche un adversaire — placé à sa vraie
 * distance et dans sa vraie direction.
 *
 * Le fond est uni. Un plan de rues stylisé y avait sa place tant qu'il portait
 * une information ; ce n'était pas le cas — il ne montrait aucune rue réelle,
 * et il concurrençait les maillots, seule chose exacte de cet écran.
 *
 * Le périmètre se règle par les pastilles sous la carte : c'est un choix parmi
 * quatre valeurs, une liste le dit mieux qu'une glissière.
 *
 * La carte ne fait que représenter la liste qui la suit : elle porte un
 * `role="img"` et son résumé, et laisse à la liste toute l'information.
 */
export function RadarScope({
  blips,
  scaleKm,
  unknownCount,
  onSelect,
  selectedId,
}: {
  blips: Blip[];
  /** Distance représentée par le cercle extérieur */
  scaleKm: number;
  /** Annonces non plaçables (ville inconnue), signalées sous la carte */
  unknownCount: number;
  onSelect: (announcementId: string) => void;
  selectedId: string | null;
}) {
  // Le résumé compte les annonces, pas les marqueurs : plusieurs équipes
  // peuvent se partager un même maillot.
  const detected = blips.reduce((n, b) => n + b.announcements.length, 0);
  const summary =
    detected === 0
      ? `Aucune équipe détectée dans un rayon de ${scaleKm} km`
      : `${detected} équipe${detected > 1 ? "s" : ""} détectée${detected > 1 ? "s" : ""} dans un rayon de ${scaleKm} km`;

  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={summary}
        // Plafonnée à 420 px : au-delà, un carré plein écran de bureau serait
        // deux fois plus haut que la fenêtre pour la même information.
        className="relative w-full max-w-[420px] mx-auto aspect-square rounded-card overflow-hidden
          border border-defined"
        style={{ backgroundColor: "var(--map-bg)" }}
      >
        {/* Vignetage : le regard tombe au centre, là où se trouve mon équipe.
            C'est la seule chose posée sur le fond uni — une profondeur, pas un
            motif : rien ne doit disputer l'attention aux maillots. */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, transparent 45%, var(--map-vignette) 100%)",
          }}
        />

        {/* Cadre carré inscrit : c'est lui qui porte l'échelle, les cercles et
            les maillots.

            La marge n'est pas décorative : un maillot est ancré par sa pointe
            basse et monte de 40 px au-dessus d'elle. Celui qui tombe sur le
            cercle extérieur — l'équipe la plus lointaine — a besoin de cette
            place, sans quoi il est rogné par le bord de la carte. */}
        <div className="absolute inset-[13%]">
          {/* Cercles de portée, or d'opacité décroissante vers l'extérieur */}
          {[
            { r: 0.333, o: 0.35 },
            { r: 0.666, o: 0.2 },
            { r: 1, o: 0.1 },
          ].map(({ r, o }) => (
            <span
              key={r}
              aria-hidden
              className="absolute rounded-full border"
              style={{
                width: `${r * 100}%`,
                height: `${r * 100}%`,
                left: `${50 - r * 50}%`,
                top: `${50 - r * 50}%`,
                borderColor: `color-mix(in srgb, var(--map-ring) ${o * 100}%, transparent)`,
              }}
            />
          ))}

          {/* Cône de balayage, un tour toutes les 8 s */}
          <span aria-hidden className="map-sweep absolute inset-0 rounded-full" />

          {/* Ma position : point doré et halo qui respire */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12
              flex items-center justify-center"
          >
            <span className="map-beacon absolute w-12 h-12 rounded-full bg-accent-solid" />
            <span
              className="relative w-3 h-3 rounded-full bg-accent-solid"
              style={{ boxShadow: "var(--accent-glow)" }}
            />
          </span>

          {/* Repères cardinaux, dans de petits carrés de verre */}
          {CARDINALS.map(({ label, cls }) => (
            <span
              key={label}
              aria-hidden
              className={cn(
                "absolute w-6 h-6 rounded-lg bg-glass border border-defined backdrop-blur-sm",
                "flex items-center justify-center text-[10px] font-bold text-secondary",
                cls,
              )}
            >
              {label}
            </span>
          ))}

          {/* Une équipe détectée, ou plusieurs au même endroit */}
          {blips.map(({ announcements, radius, bearing }) => {
            const first = announcements[0];
            const count = announcements.length;
            const km = first.distanceKm!.toLocaleString("fr-FR");
            // Un maillot groupé fait défiler ses annonces : chaque appui met la
            // suivante en avant, et revient à la première au bout.
            const current = announcements.findIndex((a) => a.id === selectedId);
            const target = announcements[(current + 1) % count];
            const seeking = announcements.some((a) => a.isSos);
            return (
              <button
                key={`${radius}-${bearing}`}
                type="button"
                onClick={() => onSelect(target.id)}
                style={position(bearing, radius)}
                // Cible de 44 px sous un maillot de 32 : le dessin reste fin
                // sans que le pouce ait à viser.
                //
                // Le recentrage est porté par `.map-pin` en CSS, PAS par les
                // utilitaires `-translate-*` : en Tailwind v4 ceux-ci écrivent
                // la propriété `translate`, qui se COMPOSE avec le `transform`
                // de l'animation au lieu de le remplacer. Les deux ensemble
                // décalaient chaque maillot de deux fois sa hauteur vers le
                // haut, et ceux du cercle extérieur sortaient de la carte.
                className="map-pin absolute w-11 flex justify-center rounded-lg focus-visible:!outline-accent"
                aria-label={
                  count === 1
                    ? `${first.team.name} — match à ${first.city}, à ${km} km`
                    : `${count} annonces à ${first.city}, à ${km} km — appuyer pour les parcourir`
                }
              >
                <JerseyPin
                  variant={seeking ? "seeking" : "free"}
                  count={count}
                  emphasis={current >= 0}
                />
              </button>
            );
          })}
        </div>

        {/* Distance représentée par le cercle extérieur */}
        <span
          aria-hidden
          className="absolute left-1/2 bottom-3 -translate-x-1/2 z-10 rounded-pill px-3 py-1
            text-[11px] font-bold tabular-nums text-accent-on bg-accent-solid"
        >
          {scaleKm} km
        </span>
      </div>

      <p className="text-[11px] text-ink-soft text-center">
        {summary}.
        {unknownCount > 0 && (
          <>
            {" "}
            {unknownCount} annonce{unknownCount > 1 ? "s" : ""} sans ville reconnue, non placée
            {unknownCount > 1 ? "s" : ""} sur la carte — voir la liste.
          </>
        )}
      </p>
    </div>
  );
}

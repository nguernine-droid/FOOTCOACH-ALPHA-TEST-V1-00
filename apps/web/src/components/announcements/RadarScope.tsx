"use client";

import { useMemo, useState } from "react";
import type { AnnouncementDto } from "@footcoach/shared";
import { JerseyPin, StreetMap } from "@/components/announcements/mapArt";
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

/** Niveaux de zoom d'affichage. 1 = tout le périmètre tient dans le cadre. */
const ZOOM_STEPS = [1, 1.4, 1.9, 2.6, 3.4];

/** Repères cardinaux, posés sur le pourtour du cadre */
const CARDINALS = [
  { label: "N", cls: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
  { label: "E", cls: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2" },
  { label: "S", cls: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2" },
  { label: "O", cls: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" },
] as const;

/**
 * Glissière verticale en forme de pill, posée sur un bord de la carte.
 *
 * Un `input[type=range]` pivoté d'un quart de tour plutôt qu'un composant
 * maison : on hérite du clavier (flèches, Début/Fin), du rôle ARIA et du
 * comportement tactile natif, ce qu'aucune reconstitution ne rend gratuitement.
 */
function Rail({
  side,
  label,
  valueText,
  index,
  max,
  onChange,
}: {
  side: "left" | "right";
  label: string;
  valueText: string;
  index: number;
  max: number;
  onChange: (index: number) => void;
}) {
  const fill = max === 0 ? 0 : (index / max) * 100;
  return (
    <div
      className={cn(
        "map-rail absolute top-1/2 -translate-y-1/2 z-20",
        side === "left" ? "left-1.5" : "right-1.5",
      )}
      style={{ ["--rail-length" as string]: "9rem", ["--rail-fill" as string]: `${fill}%` }}
    >
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={valueText}
      />
    </div>
  );
}

/**
 * Carte des matchs proches : un fond de plan nocturne, les cercles de portée,
 * un cône qui balaie la zone, et un maillot par équipe qui cherche un
 * adversaire — placé à sa vraie distance et dans sa vraie direction.
 *
 * Deux glissières bordent la carte : à gauche le périmètre réellement balayé
 * (réglage enregistré côté serveur, il décide aussi des annonces qui
 * déclenchent une notification), à droite le zoom d'affichage, qui ne change
 * rien à la recherche — il rapproche seulement le regard du centre.
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
  radiusKm,
  onRadiusChange,
}: {
  blips: Blip[];
  /** Distance représentée par le bord du cadre au zoom 1 */
  scaleKm: number;
  /** Annonces non plaçables (ville inconnue), signalées sous la carte */
  unknownCount: number;
  onSelect: (announcementId: string) => void;
  selectedId: string | null;
  /** Périmètre balayé, tel qu'enregistré. `null` = sans limite. */
  radiusKm?: number | null;
  /** Absent : la glissière de périmètre n'est pas rendue */
  onRadiusChange?: (value: number | null) => void;
}) {
  const [zoomStep, setZoomStep] = useState(0);
  const zoom = ZOOM_STEPS[zoomStep];

  // Le zoom rapproche le regard du centre : les équipes qui sortent du cadre ne
  // sont pas écrasées sur le bord (ce serait mentir sur leur distance), elles
  // sortent — et la légende sous la carte le dit.
  const placed = useMemo(
    () => blips.map((b) => ({ ...b, view: b.radius * zoom })).filter((b) => b.view <= 1),
    [blips, zoom],
  );
  const offscreen = blips.reduce((n, b) => n + b.announcements.length, 0)
    - placed.reduce((n, b) => n + b.announcements.length, 0);

  // Le résumé compte les annonces, pas les marqueurs : plusieurs équipes
  // peuvent se partager un même maillot.
  const detected = blips.reduce((n, b) => n + b.announcements.length, 0);
  const summary =
    detected === 0
      ? `Aucune équipe détectée dans un rayon de ${scaleKm} km`
      : `${detected} équipe${detected > 1 ? "s" : ""} détectée${detected > 1 ? "s" : ""} dans un rayon de ${scaleKm} km`;

  // Distance représentée par le bord du cadre au zoom courant
  const viewKm = Math.max(1, Math.round(scaleKm / zoom));

  const radiusIndex = Math.max(
    0,
    RADIUS_OPTIONS.findIndex((o) => o.value === (radiusKm ?? null)),
  );

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
        {/* Fond de plan */}
        <StreetMap className="absolute inset-0 w-full h-full" />
        {/* Vignetage : le regard tombe au centre, là où se trouve mon équipe */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, transparent 35%, var(--map-vignette) 100%)",
          }}
        />

        {/* Cadre carré inscrit : c'est lui qui porte l'échelle, les cercles et
            les maillots. Il laisse libres les bords, où vivent les glissières. */}
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
          {placed.map(({ announcements, view, bearing }) => {
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
                key={`${view}-${bearing}`}
                type="button"
                onClick={() => onSelect(target.id)}
                style={position(bearing, view)}
                // Cible de 44 px sous un maillot de 32 : le dessin reste fin
                // sans que le pouce ait à viser.
                className="map-pin absolute -translate-x-1/2 -translate-y-full w-11 flex justify-center
                  rounded-lg focus-visible:!outline-accent"
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

        {/* Périmètre balayé : la glissière de gauche */}
        {onRadiusChange && (
          <Rail
            side="left"
            label="Périmètre de recherche"
            valueText={RADIUS_OPTIONS[radiusIndex].label}
            index={radiusIndex}
            max={RADIUS_OPTIONS.length - 1}
            onChange={(i) => onRadiusChange(RADIUS_OPTIONS[i].value)}
          />
        )}

        {/* Zoom d'affichage : la glissière de droite */}
        <Rail
          side="right"
          label="Zoom de la carte"
          valueText={`Bord du cadre à ${viewKm} km`}
          index={zoomStep}
          max={ZOOM_STEPS.length - 1}
          onChange={setZoomStep}
        />

        {/* Échelle affichée, en bas au centre */}
        <span
          aria-hidden
          className="absolute left-1/2 bottom-3 -translate-x-1/2 z-10 rounded-pill px-3 py-1
            text-[11px] font-bold tabular-nums text-accent-on bg-accent-solid"
        >
          {viewKm} km
        </span>
      </div>

      <p className="text-[11px] text-ink-soft text-center">
        {summary}.
        {offscreen > 0 && (
          <>
            {" "}
            {offscreen} hors du cadre à ce niveau de zoom.
          </>
        )}
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

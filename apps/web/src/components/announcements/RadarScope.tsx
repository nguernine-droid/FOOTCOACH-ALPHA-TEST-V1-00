"use client";

import type { AnnouncementDto } from "@footcoach/shared";
import { cn } from "@/lib/utils";

/** Durée d'un tour de faisceau — partagée par le balayage et l'allumage des points */
const PERIOD_S = 4;

/** Rayons proposés, en km. `null` = aucune limite.
 *  Libellés courts : quatre pastilles doivent tenir sur 390 px sans tronquer. */
export const RADIUS_OPTIONS: { value: number | null; label: string }[] = [
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: null, label: "Illimité" },
];

export type Blip = {
  announcement: AnnouncementDto;
  /** 0 au centre, 1 sur le cercle extérieur */
  radius: number;
  bearing: number;
};

/**
 * Place une annonce sur le disque à partir de sa distance et de son relèvement.
 * Les annonces sans coordonnées (ville absente de l'annuaire) sont écartées :
 * mieux vaut ne pas les afficher que les afficher au mauvais endroit.
 */
export function toBlips(announcements: AnnouncementDto[], scaleKm: number): Blip[] {
  return announcements
    .filter((a) => a.distanceKm !== null && a.bearingDeg !== null)
    .map((a) => ({
      announcement: a,
      // Plancher à 8 % : deux clubs de la même ville se superposeraient sinon
      // exactement sur le point « moi ».
      radius: Math.min(1, Math.max(0.08, a.distanceKm! / scaleKm)),
      bearing: a.bearingDeg!,
    }));
}

/** Coordonnées en pourcentage du conteneur, nord en haut, sens horaire */
function position(bearing: number, radius: number) {
  const rad = (bearing * Math.PI) / 180;
  return {
    left: `${50 + 50 * radius * Math.sin(rad)}%`,
    top: `${50 - 50 * radius * Math.cos(rad)}%`,
  };
}

/**
 * Écran de radar : balayage tournant, cercles de portée et un point par équipe
 * qui cherche un adversaire, placé à sa vraie distance et dans sa vraie
 * direction. Chaque point s'allume au passage du faisceau — sa phase est calée
 * sur son relèvement par un `animation-delay` négatif, sans minuteur.
 *
 * L'écran ne fait que représenter la liste qui le suit : il porte un
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
  /** Annonces non plaçables (ville inconnue), signalées sous l'écran */
  unknownCount: number;
  onSelect: (announcementId: string) => void;
  selectedId: string | null;
}) {
  const summary =
    blips.length === 0
      ? `Aucune équipe détectée dans un rayon de ${scaleKm} km`
      : `${blips.length} équipe${blips.length > 1 ? "s" : ""} détectée${blips.length > 1 ? "s" : ""} dans un rayon de ${scaleKm} km`;

  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={summary}
        style={{ ["--radar-period" as string]: `${PERIOD_S}s` }}
        className="relative mx-auto w-full max-w-[264px] sm:max-w-[300px] aspect-square rounded-full overflow-hidden
          bg-[radial-gradient(circle_at_center,#0C2E6B_0%,#0A2452_55%,#071B3F_100%)]
          ring-1 ring-white/15 shadow-pop"
      >
        {/* Cercles de portée */}
        {[0.333, 0.666, 1].map((r) => (
          <span
            key={r}
            aria-hidden
            className="absolute rounded-full border border-white/12"
            style={{
              width: `${r * 100}%`,
              height: `${r * 100}%`,
              left: `${50 - r * 50}%`,
              top: `${50 - r * 50}%`,
            }}
          />
        ))}

        {/* Axes nord-sud et est-ouest */}
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-white/10" />

        {/* Faisceau tournant */}
        <span aria-hidden className="radar-sweep absolute inset-0 rounded-full" />

        {/* Points cardinaux */}
        {(
          [
            ["N", "top-1.5 left-1/2 -translate-x-1/2"],
            ["E", "right-1.5 top-1/2 -translate-y-1/2"],
            ["S", "bottom-1.5 left-1/2 -translate-x-1/2"],
            ["O", "left-1.5 top-1/2 -translate-y-1/2"],
          ] as const
        ).map(([label, cls]) => (
          <span key={label} aria-hidden className={cn("absolute text-[10px] font-bold text-white/35", cls)}>
            {label}
          </span>
        ))}

        {/* Échelle du cercle extérieur, dégagée du repère « S » */}
        <span
          aria-hidden
          className="absolute left-1/2 bottom-[13%] -translate-x-1/2 text-[10px] font-bold text-white/45 tabular-nums"
        >
          {scaleKm} km
        </span>

        {/* Ma position */}
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full
            bg-gold ring-4 ring-gold/20"
        />

        {/* Une équipe détectée */}
        {blips.map(({ announcement, radius, bearing }) => {
          // Phase négative : le point est à son maximum quand le faisceau le croise
          const delay = `${-(bearing / 360) * PERIOD_S}s`;
          const selected = selectedId === announcement.id;
          return (
            <button
              key={announcement.id}
              type="button"
              onClick={() => onSelect(announcement.id)}
              style={{ ...position(bearing, radius), animationDelay: delay }}
              // Cible de 44 px centrée sur un point de 12 px : le disque reste
              // lisible sans devenir un bouton géant.
              className={cn(
                "radar-blip absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center",
                "rounded-full focus-visible:!outline-gold",
              )}
              aria-label={`${announcement.team.name}, ${announcement.team.city}, à ${announcement.distanceKm!.toLocaleString("fr-FR")} km`}
            >
              <span
                aria-hidden
                style={{ animationDelay: delay }}
                className="radar-echo absolute w-4 h-4 rounded-full bg-white/70"
              />
              <span
                aria-hidden
                className={cn(
                  "relative w-3 h-3 rounded-full transition",
                  selected ? "bg-white ring-4 ring-white/40" : "bg-white ring-2 ring-white/30",
                )}
              />
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-ink-soft text-center">
        {summary}.
        {unknownCount > 0 && (
          <>
            {" "}
            {unknownCount} annonce{unknownCount > 1 ? "s" : ""} sans ville reconnue, non placée
            {unknownCount > 1 ? "s" : ""} sur le radar — voir la liste.
          </>
        )}
      </p>
    </div>
  );
}

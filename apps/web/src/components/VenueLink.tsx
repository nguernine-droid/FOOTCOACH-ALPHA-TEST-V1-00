"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lien d'itinéraire vers un terrain.
 *
 * `dir/?api=1` plutôt que `search/?api=1` : le coach qui touche le nom du stade
 * ne cherche pas à le situer sur une carte, il part y jouer — l'itinéraire doit
 * s'ouvrir prêt à démarrer. L'URL est celle que Google déclare universelle :
 * elle bascule sur l'application installée (iPhone comme Android) et retombe
 * sur le navigateur ailleurs, sans que nous ayons à détecter la plateforme.
 *
 * Aucun composant carte : afficher le terrain ne demande pas d'embarquer une
 * bibliothèque de cartographie, et le téléphone fait déjà mieux que nous.
 */
export function directionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function VenueLink({
  /** Ce qu'on affiche ET ce qu'on envoie à la carte : « Stade municipal, Nantes » */
  destination,
  /**
   * `row` : une ligne tappable pleine largeur, pour les fiches où le terrain
   * est une information de premier plan. `inline` : la même ligne discrète
   * qu'avant dans les listes, mais dont la zone de touche est élargie sous le
   * texte pour rester attrapable au pouce.
   */
  variant = "inline",
  className,
  iconClassName,
}: {
  destination: string;
  variant?: "inline" | "row";
  className?: string;
  iconClassName?: string;
}) {
  const label = `Itinéraire vers ${destination}`;

  if (variant === "row") {
    return (
      <a
        href={directionsUrl(destination)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={cn(
          "flex items-center gap-2 text-sm font-semibold text-ink bg-paper rounded-lg px-4 py-3 hover:bg-blue-faint transition",
          className,
        )}
      >
        <MapPin size={14} className={cn("text-blue shrink-0", iconClassName)} aria-hidden />
        <span className="flex-1 truncate">{destination}</span>
        <span className="text-xs text-ink-soft shrink-0">Itinéraire</span>
      </a>
    );
  }

  return (
    <a
      href={directionsUrl(destination)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(
        // -my-2 / py-2 : la cible grandit sans écarter les lignes voisines
        "inline-flex items-center gap-1.5 -my-2 py-2 max-w-full min-w-0 underline decoration-dotted underline-offset-4 decoration-ink-faint hover:decoration-blue transition",
        className,
      )}
    >
      <MapPin size={13} className={cn("shrink-0", iconClassName)} aria-hidden />
      <span className="truncate">{destination}</span>
    </a>
  );
}

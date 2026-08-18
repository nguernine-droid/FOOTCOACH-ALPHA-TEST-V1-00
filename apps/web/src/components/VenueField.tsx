"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb, MapPin, Search } from "lucide-react";
import { venueLabel, type VenueDto } from "@teamnexus/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Saisie du stade, avec suggestions tirées du recensement public des
 * équipements sportifs.
 *
 * Le champ reste un CHAMP LIBRE : 36 000 terrains sont recensés, mais pas tous,
 * et un club qui joue sur un terrain communal non répertorié doit pouvoir le
 * nommer. Retenir une suggestion n'est donc jamais obligatoire — c'est juste
 * mieux, parce que le terrain choisi apporte ses coordonnées exactes et que
 * l'équipe cesse d'être située au centre de sa commune.
 *
 * Même forme que la saisie du nom de club (`ClubNameField`) : le coach a déjà
 * appris ce geste à l'inscription, il n'a pas à en apprendre un second.
 */
export function VenueField({
  value,
  onChange,
  /** Terrain retenu : `null` quand le coach a tapé un nom libre */
  onPick,
  label = "Stade",
  hint,
  id = "stadium",
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (venue: VenueDto | null) => void;
  label?: string;
  hint?: React.ReactNode;
  id?: string;
  required?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<VenueDto[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<VenueDto | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recherche différée : une frappe ne déclenche pas un appel par caractère
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = value.trim();
    // Le terrain retenu vaut réponse : on ne rouvre pas la liste sous ses pieds
    if (q.length < 2 || picked?.name === value) {
      setSuggestions(null);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        setSuggestions(await api<VenueDto[]>(`/venues/search?q=${encodeURIComponent(q)}`));
      } catch {
        // Une suggestion indisponible ne bloque pas la saisie : le champ reste libre
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [value, picked]);

  function pick(venue: VenueDto) {
    setPicked(venue);
    onChange(venue.name);
    onPick(venue);
    setSuggestions(null);
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-bold text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          required={required}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={150}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // Modifier le texte détache le terrain : le nom ne correspond plus
            // à la position qu'on retenait.
            if (picked) {
              setPicked(null);
              onPick(null);
            }
          }}
          className="field pr-9"
          placeholder="Stade municipal"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
          <Search size={15} aria-hidden />
        </span>
      </div>

      {picked && (
        <p className="text-[11px] text-success font-semibold flex items-center gap-1.5">
          <MapPin size={11} aria-hidden />
          {picked.city}
          {picked.distanceKm !== null && ` · à ${picked.distanceKm} km`}
          {picked.surface && ` · ${picked.surface.toLowerCase()}`}
        </p>
      )}

      {searching && !suggestions && <p className="text-[11px] text-ink-faint">Recherche…</p>}

      {suggestions !== null && suggestions.length > 0 && (
        <ul className="rounded-lg border border-line divide-y divide-line overflow-hidden">
          {suggestions.map((venue) => (
            <li key={venue.id}>
              <button
                type="button"
                onClick={() => pick(venue)}
                className="w-full text-left px-3 py-2.5 min-h-11 transition hover:bg-blue-faint active:bg-blue-soft"
              >
                <span className="block text-sm font-semibold truncate">{venueLabel(venue)}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-ink-soft">
                  <span className="flex items-center gap-1">
                    <MapPin size={10} aria-hidden /> {venue.city}
                  </span>
                  {venue.distanceKm !== null && <span>{venue.distanceKm} km</span>}
                  {venue.surface && <span>{venue.surface.toLowerCase()}</span>}
                  {venue.floodlit && (
                    <span className="flex items-center gap-1">
                      <Lightbulb size={10} aria-hidden /> éclairé
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {suggestions !== null && suggestions.length === 0 && !searching && (
        <p className="text-[11px] text-ink-faint">
          Aucun terrain trouvé près de vous — gardez le nom que vous avez saisi, il fera l&apos;affaire.
        </p>
      )}

      {hint && <p className={cn("text-[11px] text-ink-faint")}>{hint}</p>}
    </div>
  );
}

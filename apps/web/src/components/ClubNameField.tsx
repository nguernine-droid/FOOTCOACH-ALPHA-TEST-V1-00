"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import type { ClubSuggestionDto } from "@footcoach/shared";
import { cn } from "@/lib/utils";

/** En dessous, la recherche ramène tout et n'aide personne (même seuil qu'au serveur) */
const MIN_QUERY_LENGTH = 3;
/** Attente après la dernière frappe : assez pour ne pas interroger lettre à lettre */
const DEBOUNCE_MS = 300;

/**
 * Saisie du nom de club, avec suggestions tirées de l'annuaire public des
 * entreprises.
 *
 * C'est une aide, jamais une contrainte : le champ reste une saisie libre, on
 * peut l'ignorer entièrement, et si le service est indisponible il ne se passe
 * rien de visible. Beaucoup de clubs amateurs n'ont pas d'existence dans cet
 * annuaire, et leur coach doit pouvoir s'inscrire sans se demander pourquoi son
 * club « n'existe pas ».
 *
 * Choisir une suggestion remplit aussi la ville quand l'appelant le demande —
 * c'est la moitié du bénéfice, et la commune du siège est plus fiable que ce
 * qu'on tape à la main.
 */
export function ClubNameField({
  id,
  value,
  onChange,
  onPickCity,
  placeholder,
  required,
  minLength,
  maxLength,
  className,
  "aria-invalid": ariaInvalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Appelé quand une suggestion porte une commune — laisse l'appelant décider */
  onPickCity?: (city: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<ClubSuggestionDto[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  /**
   * Ce que le coach vient de choisir. Sert à ne PAS relancer une recherche sur
   * une valeur qu'on a nous-mêmes écrite dans le champ — sans quoi la liste se
   * rouvrirait aussitôt après la sélection.
   */
  const justPicked = useRef<string | null>(null);

  useEffect(() => {
    if (justPicked.current === value) return;
    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        // Volontairement `fetch` et non le client `api` : la route est publique
        // (elle sert à l'inscription) et n'a pas besoin de session. Un échec ne
        // doit rien afficher, d'où l'absence de gestion d'erreur visible.
        const res = await fetch(`/api/clubs/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const found = (await res.json()) as ClubSuggestionDto[];
        setSuggestions(found);
        setActive(-1);
        setOpen(found.length > 0);
      } catch {
        // Réseau coupé, service lent, requête annulée : le champ reste libre.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  // Un clic hors du champ referme la liste — sans quoi elle resterait ouverte
  // par-dessus la suite du formulaire.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function pick(suggestion: ClubSuggestionDto) {
    justPicked.current = suggestion.name;
    onChange(suggestion.name);
    if (suggestion.city && onPickCity) onPickCity(suggestion.city);
    setOpen(false);
    setSuggestions([]);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      // Seulement quand une suggestion est SURLIGNÉE : sans cela, Entrée doit
      // valider le formulaire comme partout ailleurs.
      event.preventDefault();
      pick(suggestions[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => {
          justPicked.current = null;
          onChange(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete="off"
        autoCapitalize="words"
        enterKeyHint="next"
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className={cn("field", className)}
      />

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line
            surface shadow-pop py-1"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.name}-${suggestion.postalCode ?? index}`}>
              <button
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // `onPointerDown` et non `onClick` : le clic arrive après le
                // `blur`, qui aurait déjà refermé la liste.
                onPointerDown={(e) => {
                  e.preventDefault();
                  pick(suggestion);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "w-full min-h-11 px-4 py-2 flex items-center gap-2.5 text-left transition",
                  index === active ? "bg-blue-soft" : "hover:bg-paper",
                )}
              >
                <Search size={13} className="text-ink-faint shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold truncate">{suggestion.name}</span>
                  {suggestion.city && (
                    <span className="block text-[11px] text-ink-soft truncate flex items-center gap-1">
                      <MapPin size={10} className="shrink-0" aria-hidden />
                      {suggestion.city}
                      {suggestion.postalCode ? ` · ${suggestion.postalCode}` : ""}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

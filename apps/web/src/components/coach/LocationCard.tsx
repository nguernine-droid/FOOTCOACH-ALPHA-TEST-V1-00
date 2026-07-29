"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, MapPin, Search, Users, X } from "lucide-react";
import type { GeoSuggestionDto, UserDto } from "@footcoach/shared";
import { coarseCoord } from "@footcoach/shared";
import { ApiError, api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

const SOURCE_LABELS = {
  gps: "Position de l'appareil",
  address: "Adresse saisie",
  team: "Ville de mon équipe",
} as const;

/**
 * Réglage du point d'où le coach rayonne : distances des annonces, centre du
 * radar, et périmètre des alertes.
 *
 * Deux chemins volontairement séparés — la géolocalisation en un geste, la
 * saisie d'adresse pour ceux qui la refusent ou qui rayonnent depuis ailleurs
 * que leur position du moment.
 */
export function LocationCard({ user, onChange }: { user: UserDto; onChange: (updated: UserDto) => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoSuggestionDto[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const location = user.location ?? null;

  // Recherche différée : une frappe ne déclenche pas un appel par caractère
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions(null);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        setSuggestions(await api<GeoSuggestionDto[]>(`/geo/search?q=${encodeURIComponent(q)}`));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  async function save(lat: number, lng: number, label: string, source: "gps" | "address") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      onChange(
        await api<UserDto>("/me/location", {
          method: "PUT",
          body: JSON.stringify({ lat, lng, label, source }),
        }),
      );
      setQuery("");
      setSuggestions(null);
      setMessage("Position enregistrée");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  function useDeviceLocation() {
    if (!("geolocation" in navigator)) {
      setError("Cet appareil ne permet pas la géolocalisation.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = coarseCoord(position.coords.latitude);
        const lng = coarseCoord(position.coords.longitude);
        // Un libellé lisible vaut mieux que deux nombres ; à défaut on garde
        // les coordonnées, la position reste utilisable.
        let label = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
        try {
          const { suggestion } = await api<{ suggestion: GeoSuggestionDto | null }>(
            `/geo/reverse?lat=${lat}&lng=${lng}`,
          );
          if (suggestion) label = suggestion.city || suggestion.label;
        } catch {
          // Géocodage inverse indisponible : on garde les coordonnées
        }
        await save(lat, lng, label, "gps");
      },
      (err) => {
        setBusy(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Accès à la position refusé. Autorisez-le dans votre navigateur, ou saisissez une adresse."
            : "Position indisponible pour le moment.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  async function resetToTeam() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      onChange(await api<UserDto>("/me/location", { method: "DELETE" }));
      setMessage("Retour à la ville de votre équipe");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Réinitialisation impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 space-y-4" aria-label="Ma position">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
          <MapPin size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="display text-lg leading-none">Ma position</h3>
          <p className="text-xs text-ink-soft">Le centre de votre radar et des distances affichées.</p>
        </div>
      </div>

      {/* Position actuelle */}
      <div className="rounded-lg bg-paper px-4 py-3 flex items-center gap-3">
        <span className="w-9 h-9 rounded-full surface flex items-center justify-center shrink-0">
          {location?.source === "team" ? (
            <Users size={16} className="text-ink-soft" />
          ) : (
            <MapPin size={16} className="text-blue" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate">{location?.label ?? "Aucune position connue"}</p>
          <p className="text-[11px] text-ink-soft font-semibold">
            {location ? SOURCE_LABELS[location.source] : "Ni position réglée, ni ville d'équipe reconnue"}
          </p>
        </div>
      </div>

      {!location && (
        <p className="text-xs text-ink-soft bg-sun-soft rounded-lg px-4 py-3">
          Sans position, le radar reste vide et aucune distance ne s&apos;affiche sur les annonces.
        </p>
      )}

      <Button className="w-full" onClick={useDeviceLocation} disabled={busy}>
        <Crosshair size={16} /> Utiliser ma position
      </Button>

      <div className="flex items-center gap-3">
        <span className="flex-1 h-px bg-line" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">ou</span>
        <span className="flex-1 h-px bg-line" aria-hidden />
      </div>

      {/* Saisie d'adresse */}
      <div className="space-y-1.5">
        <label htmlFor="address" className="text-xs font-bold text-ink-soft">
          Adresse ou commune
        </label>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            id="address"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="field pl-11"
            placeholder="Bourgoin-Jallieu, 12 rue du Stade…"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="icon-btn absolute right-1 top-1/2 -translate-y-1/2 text-ink-soft"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {searching && <p className="text-xs text-ink-soft animate-soft-pulse px-1">Recherche…</p>}

        {suggestions && suggestions.length === 0 && !searching && (
          <p className="text-xs text-ink-soft px-1">
            Aucune adresse trouvée. Essayez le nom de la commune seule.
          </p>
        )}

        {suggestions && suggestions.length > 0 && (
          <ul className="rounded-lg border border-line divide-y divide-line overflow-hidden">
            {suggestions.map((s) => (
              <li key={`${s.label}-${s.lat}-${s.lng}`}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => save(s.lat, s.lng, s.label, "address")}
                  className="w-full min-h-14 flex items-center gap-3 px-4 text-left transition hover:bg-paper active:bg-blue-soft"
                >
                  <MapPin size={16} className="text-blue shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold truncate">{s.label}</span>
                    {s.postcode && (
                      <span className="block text-[11px] text-ink-soft font-semibold">{s.postcode}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {location && location.source !== "team" && (
        <Button variant="ghost" className="w-full" onClick={resetToTeam} disabled={busy}>
          Revenir à la ville de mon équipe
        </Button>
      )}

      {error && (
        <p className="animate-message text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>
      )}
      {message && (
        <p className="animate-message text-xs font-semibold text-success bg-success-soft rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <p className="text-[11px] text-ink-soft">
        Votre position est arrondie au kilomètre : elle sert à mesurer des distances, pas à vous localiser
        précisément. Elle n&apos;est jamais montrée aux autres coachs.
      </p>
    </section>
  );
}

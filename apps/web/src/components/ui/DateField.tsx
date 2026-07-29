"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useIsCompact } from "@/lib/useIsCompact";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Grille du mois — partagée par la feuille mobile et le popover desktop */
function Calendar({
  view,
  setView,
  value,
  min,
  onPick,
  compact,
}: {
  view: Date;
  setView: (d: Date) => void;
  value: string;
  min?: string;
  onPick: (iso: string) => void;
  compact: boolean;
}) {
  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7; // semaine qui commence lundi
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const todayIso = toIso(new Date());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="icon-btn text-ink-soft hover:bg-paper"
          aria-label="Mois précédent"
        >
          <ChevronLeft size={18} />
        </button>
        <p className={cn("font-bold capitalize", compact ? "text-base" : "text-sm")}>
          {view.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="icon-btn text-ink-soft hover:bg-paper"
          aria-label="Mois suivant"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={cn("grid grid-cols-7 text-center", compact ? "gap-1" : "gap-0.5")}>
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-[11px] font-bold text-ink-soft py-1">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`o${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const iso = toIso(new Date(view.getFullYear(), view.getMonth(), i + 1));
          const disabled = min ? iso < min : false;
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onPick(iso)}
              // 48 px de haut sur mobile : la cellule d'un calendrier est la
              // cible la plus ratée d'un formulaire au pouce.
              className={cn(
                "rounded-lg font-semibold transition",
                compact ? "h-12 text-sm" : "h-8 text-xs",
                selected ? "bg-blue text-white font-black" : "hover:bg-blue-soft active:bg-blue-soft text-ink",
                iso === todayIso && !selected && "ring-1 ring-blue/40",
                disabled && "text-ink-faint/50 pointer-events-none",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Sélecteur de date stylé — valeur au format YYYY-MM-DD. */
export function DateField({
  id,
  value,
  onChange,
  required,
  min,
  placeholder = "Choisir une date",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Date minimale sélectionnable (YYYY-MM-DD) */
  min?: string;
  placeholder?: string;
}) {
  const compact = useIsCompact();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur : uniquement pour le popover desktop, la
  // feuille mobile gère elle-même son fond et son bouton de fermeture.
  useEffect(() => {
    if (!open || compact) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, compact]);

  const label = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : null;

  function pick(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  const calendar = (
    <Calendar view={view} setView={setView} value={value} min={min} onPick={pick} compact={compact} />
  );

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        // `capitalize` sert à la date en français (« jeu. 30 juil. ») ; appliqué
        // au placeholder il donnait « Choisir Une Date ».
        className={cn("field text-left flex items-center gap-2.5", value ? "capitalize" : "text-ink-faint")}
      >
        <CalendarDays size={16} className="text-blue shrink-0" />
        <span className="truncate">{label ?? placeholder}</span>
      </button>
      {/* Champ caché pour la validation required du formulaire */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={value}
          onChange={() => undefined}
          className="absolute inset-0 opacity-0 pointer-events-none"
        />
      )}

      {open &&
        (compact ? (
          <BottomSheet
            label="Choisir une date"
            onClose={() => setOpen(false)}
            footer={
              <div className="flex gap-2">
                <button
                  type="button"
                  // Raccourci sans objet si le champ n'accepte que des dates futures
                  disabled={Boolean(min) && toIso(new Date()) < min!}
                  onClick={() => pick(toIso(new Date()))}
                  className="flex-1 min-h-12 rounded-lg bg-blue-soft text-primary text-sm font-bold transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
                >
                  Aujourd&apos;hui
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 min-h-12 rounded-lg border border-line text-ink-soft text-sm font-bold transition active:scale-[0.97]"
                >
                  Fermer
                </button>
              </div>
            }
          >
            {/* Marges resserrées : sept colonnes doivent tenir en 44 px chacune */}
            <div className="px-3 pb-2">{calendar}</div>
          </BottomSheet>
        ) : (
          <div role="dialog" aria-label="Calendrier" className="absolute z-30 top-full mt-2 card p-3 w-64 animate-rise-in">
            {calendar}
          </div>
        ))}
    </div>
  );
}

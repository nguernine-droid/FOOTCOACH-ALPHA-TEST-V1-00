"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Sélecteur de date stylé (popover calendrier) — valeur au format YYYY-MM-DD. */
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
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const label = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : null;

  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7; // semaine qui commence lundi
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const todayIso = toIso(new Date());

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn("field text-left flex items-center gap-2.5 capitalize", !value && "text-ink-faint")}
      >
        <CalendarDays size={15} className="text-blue shrink-0" />
        {label ?? placeholder}
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

      {open && (
        <div role="dialog" aria-label="Calendrier" className="absolute z-30 top-full mt-2 card p-3 w-64 animate-rise-in">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-paper text-ink-soft"
              aria-label="Mois précédent"
            >
              <ChevronLeft size={15} />
            </button>
            <p className="text-sm font-bold capitalize">
              {view.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-paper text-ink-soft"
              aria-label="Mois suivant"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="text-[10px] font-bold text-ink-faint py-1">
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
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-8 rounded-lg text-xs font-semibold transition",
                    selected ? "bg-blue text-white font-black" : "hover:bg-blue-soft text-ink",
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
      )}
    </div>
  );
}

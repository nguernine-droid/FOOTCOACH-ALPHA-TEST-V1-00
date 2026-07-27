"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useIsCompact } from "@/lib/useIsCompact";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];
/** Créneaux réalistes d'un match ou d'un entraînement, en tête de la feuille */
const COMMON_HOURS = ["09", "10", "11", "14", "15", "16", "18", "19"];

/** Sélecteur d'heure stylé — valeur au format HH:MM. */
export function TimeField({
  id,
  value,
  onChange,
  required,
  placeholder = "Choisir une heure",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const compact = useIsCompact();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);

  const [hour, minute] = value ? value.split(":") : [null, null];

  useEffect(() => {
    if (!open || compact) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    // Amène l'heure sélectionnée (ou une heure raisonnable) dans la vue
    const target = hoursRef.current?.querySelector<HTMLButtonElement>(`[data-hour="${hour ?? "10"}"]`);
    target?.scrollIntoView({ block: "center" });
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, compact, hour]);

  const cell = (selected: boolean) =>
    cn(
      "rounded-lg font-semibold transition tabular-nums",
      compact ? "min-h-12 text-sm" : "w-full h-8 text-xs",
      selected
        ? "bg-blue text-white font-black"
        : cn("text-ink hover:bg-blue-soft active:bg-blue-soft", compact && "bg-paper"),
    );

  return (
    <div className="relative" ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn("field text-left flex items-center gap-2.5", !value && "text-ink-faint")}
      >
        <Clock size={16} className="text-blue shrink-0" />
        <span className="truncate">{value || placeholder}</span>
      </button>
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
          /* Mobile : deux grilles à plat. L'ancienne liste d'heures défilante
             imbriquée dans un popover était impraticable au pouce. */
          <BottomSheet
            label="Choisir une heure"
            onClose={() => setOpen(false)}
            footer={
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full min-h-12 rounded-lg bg-blue text-white text-sm font-bold transition active:scale-[0.97]"
              >
                {value ? `Valider ${value}` : "Fermer"}
              </button>
            }
          >
            <div className="px-5 pb-2 space-y-4">
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Créneaux courants</p>
                <div className="grid grid-cols-4 gap-2">
                  {COMMON_HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onChange(`${h}:${minute ?? "00"}`)}
                      className={cell(h === hour)}
                    >
                      {h} h
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Heure</p>
                <div className="grid grid-cols-6 gap-2">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onChange(`${h}:${minute ?? "00"}`)}
                      className={cell(h === hour)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Minutes</p>
                <div className="grid grid-cols-4 gap-2">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onChange(`${hour ?? "10"}:${m}`)}
                      className={cell(m === minute)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </BottomSheet>
        ) : (
          <div role="dialog" aria-label="Heure" className="absolute z-30 top-full mt-2 card p-3 w-48 animate-rise-in">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mb-1 text-center">Heure</p>
                <div ref={hoursRef} className="max-h-44 overflow-y-auto no-scrollbar space-y-0.5">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-hour={h}
                      onClick={() => onChange(`${h}:${minute ?? "00"}`)}
                      className={cell(h === hour)}
                    >
                      {h} h
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-ink-soft uppercase tracking-wider mb-1 text-center">Minutes</p>
                <div className="space-y-0.5">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        onChange(`${hour ?? "10"}:${m}`);
                        setOpen(false);
                      }}
                      className={cell(m === minute)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

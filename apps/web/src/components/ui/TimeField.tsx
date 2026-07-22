"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

/** Sélecteur d'heure stylé (popover heures/minutes) — valeur au format HH:MM. */
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);

  const [hour, minute] = value ? value.split(":") : [null, null];

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    // Amène l'heure sélectionnée (ou une heure raisonnable) dans la vue
    const target = hoursRef.current?.querySelector<HTMLButtonElement>(`[data-hour="${hour ?? "10"}"]`);
    target?.scrollIntoView({ block: "center" });
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, hour]);

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
        <Clock size={15} className="text-blue shrink-0" />
        {value || placeholder}
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

      {open && (
        <div role="dialog" aria-label="Heure" className="absolute z-30 top-full mt-2 card p-3 w-48 animate-rise-in">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-1 text-center">Heure</p>
              <div ref={hoursRef} className="max-h-44 overflow-y-auto no-scrollbar space-y-0.5">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-hour={h}
                    onClick={() => onChange(`${h}:${minute ?? "00"}`)}
                    className={cn(
                      "w-full h-8 rounded-lg text-xs font-semibold transition",
                      h === hour ? "bg-blue text-white font-black" : "hover:bg-blue-soft",
                    )}
                  >
                    {h} h
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-ink-faint uppercase tracking-wider mb-1 text-center">Minutes</p>
              <div className="space-y-0.5">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onChange(`${hour ?? "10"}:${m}`);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full h-8 rounded-lg text-xs font-semibold transition",
                      m === minute ? "bg-blue text-white font-black" : "hover:bg-blue-soft",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

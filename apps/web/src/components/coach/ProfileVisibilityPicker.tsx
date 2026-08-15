"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  PROFILE_PRIVATE_DESCRIPTION,
  PROFILE_PRIVATE_LABEL,
  PROFILE_PUBLIC_DESCRIPTION,
  PROFILE_PUBLIC_LABEL,
} from "@teamnexus/shared";
import { cn } from "@/lib/utils";

/**
 * Public ou privé, en deux cartes plutôt qu'un interrupteur.
 *
 * Un interrupteur n'aurait dit que la moitié du choix : « privé » ne veut pas
 * dire invisible, et un coach qui coche sans savoir ce qu'il perd — ni ce qu'il
 * garde — se retirerait d'une liste sans comprendre pourquoi personne ne le
 * trouve. Les deux textes sont donc affichés côte à côte, comme pour les
 * casquettes, et ce sont les MÊMES qu'à l'inscription (libellés partagés).
 */
export function ProfileVisibilityPicker({
  value,
  onChange,
  idPrefix,
  disabled,
}: {
  value: boolean;
  onChange: (profilePublic: boolean) => void;
  idPrefix: string;
  disabled?: boolean;
}) {
  const options = [
    { value: true, label: PROFILE_PUBLIC_LABEL, description: PROFILE_PUBLIC_DESCRIPTION, Icon: Eye },
    { value: false, label: PROFILE_PRIVATE_LABEL, description: PROFILE_PRIVATE_DESCRIPTION, Icon: EyeOff },
  ];

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Visibilité de mon profil">
      {options.map(({ value: optionValue, label, description, Icon }) => {
        const selected = value === optionValue;
        return (
          <button
            key={label}
            id={`${idPrefix}-${optionValue ? "public" : "prive"}`}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            className={cn(
              "w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition",
              selected
                ? "border-blue bg-blue-soft"
                : "border-line bg-paper hover:border-blue/40 disabled:opacity-60",
            )}
          >
            <span
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                selected ? "bg-white/70 text-blue" : "bg-white/60 text-ink-soft",
              )}
            >
              <Icon size={18} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{label}</span>
              <span className="block text-[11px] text-ink-soft leading-snug">{description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

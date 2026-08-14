"use client";

import { useEffect, useState } from "react";
import { Building2, Check, MapPin } from "lucide-react";
import type { DeclaredClubDto } from "@teamnexus/shared";
import { ClubNameField } from "@/components/ClubNameField";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";

/** Attente après la dernière frappe avant d'aller voir si ce club existe déjà */
const DEBOUNCE_MS = 400;

export interface ClubDeclaration {
  name: string;
  city: string;
  stadium: string;
}

/** Ce que le formulaire appelant enverra : un club reconnu, ou un club à déclarer */
export function clubPayload(
  declaration: ClubDeclaration,
  picked: DeclaredClubDto | null,
): { clubId?: string; club?: { name: string; city: string; stadium?: string } } {
  if (picked) return { clubId: picked.id };
  if (!declaration.name.trim() || !declaration.city.trim()) return {};
  return {
    club: {
      name: declaration.name.trim(),
      city: declaration.city.trim(),
      stadium: declaration.stadium.trim() || undefined,
    },
  };
}

/**
 * Déclaration d'un club à la main : nom, ville, stade — plus la question qui
 * évite le doublon.
 *
 * L'annuaire public (SIRENE) ne connaît pas la plupart des clubs amateurs. Le
 * coach doit donc pouvoir nommer le sien lui-même ; mais deux coachs du MÊME
 * club qui le déclarent chacun de leur côté créeraient deux lignes, et rien ne
 * les rapprocherait ensuite. D'où la question, posée dès que le nom saisi
 * ressemble à un club déjà connu dans la même ville : « n'est-ce pas déjà ce
 * club ? »
 *
 * Elle se pose, elle ne s'impose pas : « Non, c'est un autre club » est toujours
 * disponible et crée bien la seconde ligne — deux clubs homonymes existent
 * vraiment, et bloquer serait pire que doublonner.
 */
export function ClubDeclarationFields({
  idPrefix,
  value,
  onChange,
  picked,
  onPick,
}: {
  idPrefix: string;
  value: ClubDeclaration;
  onChange: (next: ClubDeclaration) => void;
  /** Club existant reconnu par le coach — il prend alors la place de la saisie */
  picked: DeclaredClubDto | null;
  onPick: (club: DeclaredClubDto | null) => void;
}) {
  const [candidates, setCandidates] = useState<DeclaredClubDto[]>([]);
  const [asking, setAsking] = useState(false);
  /** Ce qu'on a déjà proposé sans succès : ne pas reposer la question à chaque lettre */
  const [dismissed, setDismissed] = useState<string[]>([]);

  const name = value.name.trim();
  const city = value.city.trim();

  useEffect(() => {
    if (picked || name.length < 2 || city.length < 1) {
      setCandidates([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/clubs/declared?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const found = (await res.json()) as DeclaredClubDto[];
        const fresh = found.filter((c) => !dismissed.includes(c.id));
        setCandidates(fresh);
        // La question s'ouvre d'elle-même : un bandeau discret se serait fait
        // ignorer, et c'est justement l'erreur qu'on cherche à éviter.
        if (fresh.length > 0) setAsking(true);
      } catch {
        // Réseau coupé ou requête annulée : la saisie reste libre, on ne bloque rien.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, city, picked, dismissed]);

  if (picked) {
    return (
      <div className="rounded-lg bg-blue-soft px-4 py-3 flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-white/70 text-blue flex items-center justify-center shrink-0">
          <Building2 size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold truncate">{picked.name}</span>
          <span className="block text-xs text-ink-soft truncate">
            {picked.city}
            {picked.stadium ? ` · ${picked.stadium}` : ""}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={() => onPick(null)}>
          Changer
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-club-name`} className="text-xs font-bold text-ink-soft">
          Nom du club <span className="font-semibold text-ink-faint">(facultatif)</span>
        </label>
        <ClubNameField
          id={`${idPrefix}-club-name`}
          value={value.name}
          onChange={(name) => onChange({ ...value, name })}
          onPickCity={(city) => onChange({ ...value, city })}
          maxLength={80}
          placeholder="AS Exemple"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-club-city`} className="text-xs font-bold text-ink-soft">
          Ville du club
        </label>
        <input
          id={`${idPrefix}-club-city`}
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          autoComplete="address-level2"
          autoCapitalize="words"
          maxLength={60}
          className="field"
          placeholder="Lyon"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-club-stadium`} className="text-xs font-bold text-ink-soft">
          Stade
        </label>
        <input
          id={`${idPrefix}-club-stadium`}
          value={value.stadium}
          onChange={(e) => onChange({ ...value, stadium: e.target.value })}
          autoCapitalize="words"
          maxLength={150}
          className="field"
          placeholder="Stade Municipal"
        />
      </div>

      {asking && candidates.length > 0 && (
        <BottomSheet label="Ce club existe peut-être déjà" onClose={() => setAsking(false)}>
          <div className="space-y-3">
            <h3 className="display text-lg">Ce club existe peut-être déjà</h3>
            <p className="text-xs text-ink-soft">
              Un club de ce nom est déjà connu à {city}. S&apos;il s&apos;agit du vôtre, rattachez-vous à
              lui : vos équipes et celles de vos collègues resteront au même endroit.
            </p>
            <ul className="space-y-2">
              {candidates.map((club) => (
                <li key={club.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(club);
                      setAsking(false);
                    }}
                    className="w-full flex items-center gap-3 rounded-lg bg-paper px-4 py-3 text-left transition
                      hover:bg-blue-faint active:bg-blue-soft"
                  >
                    <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
                      <Building2 size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold truncate">{club.name}</span>
                      <span className="block text-xs text-ink-soft truncate flex items-center gap-1">
                        <MapPin size={10} className="shrink-0" aria-hidden />
                        {club.city}
                        {club.stadium ? ` · ${club.stadium}` : ""}
                      </span>
                    </span>
                    <Check size={16} className="text-blue shrink-0" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="soft"
              className="w-full"
              onClick={() => {
                // Écarté pour de bon : sans cette mémoire, la question
                // reviendrait à la frappe suivante, ce qui est le meilleur
                // moyen de faire cliquer « oui » sans lire.
                setDismissed((ids) => [...ids, ...candidates.map((c) => c.id)]);
                setCandidates([]);
                setAsking(false);
              }}
            >
              Non, c&apos;est un autre club
            </Button>
          </div>
        </BottomSheet>
      )}
    </>
  );
}

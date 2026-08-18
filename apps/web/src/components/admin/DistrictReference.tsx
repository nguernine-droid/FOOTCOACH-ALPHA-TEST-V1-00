"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, ShieldCheck, ShieldQuestion } from "lucide-react";
import {
  departmentLabel,
  DEPARTMENTS_WITHOUT_DISTRICT,
  DISTRICT_SOURCE_LABELS,
  type DistrictDto,
} from "@teamnexus/shared";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/**
 * Le référentiel des districts, et sa relecture.
 *
 * La fédération ne publie pas la liste de ses districts. Celle-ci a été bâtie
 * sur le registre officiel des associations, qui en rend la plus grande partie
 * mais pas la totalité : une dizaine de districts n'y sont pas déclarés sous un
 * nom contenant « district », et ont donc été saisis à la main.
 *
 * D'où cet écran : il met en tête ce qui reste à confirmer. Valider une ligne
 * la protège définitivement des réimports — c'est le sens du geste, et il est
 * dit en toutes lettres avant qu'on le fasse.
 */
export function DistrictReference() {
  const [rows, setRows] = useState<DistrictDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await api<DistrictDto[]>("/admin/districts-reference"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toVerify = rows?.filter((r) => !r.verified).length ?? 0;

  return (
    <section className="space-y-3" aria-label="Référentiel des districts">
      <div className="space-y-1">
        <h2 className="display text-lg">Référentiel des districts</h2>
        <p className="text-xs text-ink-soft max-w-[70ch]">
          {rows ? `${rows.length} districts` : "Chargement"} — bâtis sur le registre officiel des associations, que la
          fédération ne complète pas. {toVerify > 0 && <strong>{toVerify} restent à confirmer</strong>}
          {toVerify > 0 && " : ils n'y figurent pas sous un nom trouvable et ont été saisis à la main."}
        </p>
      </div>

      {/* Dit une fois : sans cette phrase, on cherche un district corse
          pendant une heure avant de comprendre qu'il n'en existe pas. */}
      <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
        Sans district, et ce n&apos;est pas un oubli :{" "}
        {DEPARTMENTS_WITHOUT_DISTRICT.map((code) => departmentLabel(code)).join(", ")} — leur ligue administre
        directement.
      </p>

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      {!rows ? (
        <CardGridSkeleton cards={3} />
      ) : (
        <ul className="space-y-2">
          {rows.map((district) => (
            <DistrictRow key={district.id} district={district} onChange={load} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DistrictRow({ district, onChange }: { district: DistrictDto; onChange: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(district.name);
  const [departments, setDepartments] = useState(district.departments.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(verified?: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/districts-reference/${district.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          departments: departments
            .split(",")
            .map((d) => d.trim().toUpperCase())
            .filter(Boolean),
          ...(verified !== undefined ? { verified } : {}),
        }),
      });
      setEditing(false);
      await onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={cn("card p-4 space-y-2", !district.verified && "border-sun/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-bold text-sm">{district.name}</p>
          <p className="text-xs text-ink-soft">
            {district.departments.map((code) => departmentLabel(code)).join(" · ")}
          </p>
          {district.legalName && (
            <p className="text-[11px] text-ink-faint">
              {district.legalName}
              {district.siren && ` · SIREN ${district.siren}`}
              {district.city && ` · ${district.city}`}
            </p>
          )}
        </div>
        <span
          className={cn(
            "chip shrink-0",
            district.verified ? "bg-success-soft text-success" : "bg-sun-soft text-sun",
          )}
          title={DISTRICT_SOURCE_LABELS[district.source]}
        >
          {district.verified ? <ShieldCheck size={11} aria-hidden /> : <ShieldQuestion size={11} aria-hidden />}
          {district.verified ? "Confirmé" : "À vérifier"}
        </span>
      </div>

      {error && <p className="text-xs font-semibold text-coral">{error}</p>}

      {editing ? (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-ink-soft">Nom</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="field" maxLength={120} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-ink-soft">
              Départements <span className="font-semibold text-ink-faint">(codes séparés par une virgule)</span>
            </span>
            <input
              value={departments}
              onChange={(e) => setDepartments(e.target.value)}
              className="field"
              placeholder="69, 01"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => save(true)} disabled={busy}>
              <Check size={13} /> Enregistrer et confirmer
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
              Annuler
            </Button>
          </div>
          <p className="text-[11px] text-ink-faint">
            Confirmer protège cette ligne des réimports : le script ne la réécrira plus.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Corriger
          </Button>
          {!district.verified && (
            <Button variant="soft" size="sm" onClick={() => save(true)} disabled={busy}>
              <Check size={13} /> Confirmer tel quel
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Check, GitMerge, Pencil, Search, Trash2, TriangleAlert, Users, X } from "lucide-react";
import type { AdminClubDto, AdminClubDuplicateGroupDto } from "@teamnexus/shared";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/** Ce qui suivra le club gardé, dit en toutes lettres avant de fusionner */
function attachments(club: AdminClubDto): string {
  const parts: string[] = [];
  if (club.teamsCount) parts.push(`${club.teamsCount} équipe${club.teamsCount > 1 ? "s" : ""}`);
  if (club.coachesCount) parts.push(`${club.coachesCount} coach${club.coachesCount > 1 ? "s" : ""}`);
  if (club.pendingRequests) {
    parts.push(`${club.pendingRequests} demande${club.pendingRequests > 1 ? "s" : ""} en attente`);
  }
  return parts.length ? parts.join(" · ") : "Aucun rattachement";
}

/**
 * Un club à compte de connexion ne peut pas être absorbé : son compte et son
 * code d'affiliation disparaîtraient avec lui. C'est donc lui, et lui seul,
 * qu'on peut garder d'un groupe — l'API le refuse de toute façon, mais mieux
 * vaut ne pas proposer un bouton qui échouera.
 */
function mergeBlockedReason(target: AdminClubDto, group: AdminClubDto[]): string | null {
  const withAccount = group.filter((c) => c.hasAccount);
  if (withAccount.length > 1) return "Plusieurs de ces clubs ont un compte : traitez les comptes d'abord.";
  if (withAccount.length === 1 && withAccount[0].id !== target.id) {
    return `« ${withAccount[0].name} » a un compte de connexion : c'est celui-là qu'il faut garder.`;
  }
  return null;
}

function ClubChips({ club }: { club: AdminClubDto }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={cn("chip", club.hasAccount ? "bg-blue-soft text-primary" : "bg-paper text-ink-soft")}>
        {club.hasAccount ? "Compte club" : "Déclaré par un coach"}
      </span>
      <span className="chip bg-paper text-ink-soft">
        <Users size={11} /> {attachments(club)}
      </span>
      {club.stadium && <span className="chip bg-paper text-ink-soft">{club.stadium}</span>}
    </div>
  );
}

/** Correction d'écriture — le geste le plus courant : un nom mal orthographié */
function EditForm({ club, onDone, onCancel }: { club: AdminClubDto; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: club.name, city: club.city, stadium: club.stadium ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <form
      className="space-y-3 border-t border-line pt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api(`/admin/clubs/${club.id}`, { method: "PATCH", body: JSON.stringify(form) });
          onDone();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Modification impossible");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-ink-soft" htmlFor={`name-${club.id}`}>Nom</label>
        <input
          id={`name-${club.id}`}
          required
          minLength={2}
          maxLength={80}
          autoCapitalize="words"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="field"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-ink-soft" htmlFor={`city-${club.id}`}>Ville</label>
        <input
          id={`city-${club.id}`}
          required
          maxLength={60}
          autoCapitalize="words"
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
          className="field"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-ink-soft" htmlFor={`stadium-${club.id}`}>Stade</label>
        <input
          id={`stadium-${club.id}`}
          maxLength={150}
          autoCapitalize="words"
          value={form.stadium}
          onChange={(e) => set("stadium", e.target.value)}
          className="field"
        />
      </div>
      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

/**
 * Fusion : on choisit le club à GARDER, celui de la carte disparaît. Le sens
 * est écrit à chaque ligne — c'est une opération irréversible, et la seule
 * erreur possible est de la faire à l'envers.
 */
function MergeSheet({
  source,
  clubs,
  onClose,
  onMerged,
}: {
  source: AdminClubDto;
  clubs: AdminClubDto[];
  onClose: () => void;
  onMerged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<AdminClubDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  // Sa ville d'abord : c'est là que se trouve le club qu'on cherche neuf fois
  // sur dix, et cela évite de fusionner avec l'homonyme d'un autre département.
  const candidates = clubs
    .filter((c) => c.id !== source.id)
    .filter((c) => (q ? `${c.name} ${c.city}`.toLowerCase().includes(q) : true))
    .sort(
      (a, b) =>
        Number(b.city.toLowerCase() === source.city.toLowerCase()) -
          Number(a.city.toLowerCase() === source.city.toLowerCase()) || a.name.localeCompare(b.name),
    )
    .slice(0, 30);

  async function merge() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/clubs/${target.id}/merge`, {
        method: "POST",
        body: JSON.stringify({ sourceId: source.id }),
      });
      onMerged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Fusion impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      label={`Fusionner ${source.name}`}
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" variant="danger" disabled={!target || busy} onClick={merge}>
            <GitMerge size={14} /> Fusionner
          </Button>
        </div>
      }
    >
      <div className="p-5 pt-2 space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-black">Fusionner « {source.name} »</h3>
          <p className="text-sm text-ink-soft">
            Ce club disparaîtra. {attachments(source)} — tout sera rattaché au club que vous gardez.
          </p>
        </div>

        {source.hasAccount && (
          <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">
            Ce club a un compte de connexion : il ne peut pas disparaître. Fusionnez l&apos;autre club dedans.
          </p>
        )}

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="field pl-11"
            placeholder="Club à garder…"
            aria-label="Rechercher le club à garder"
          />
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {candidates.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => setTarget(club)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg surface px-3 py-2.5 text-left text-xs transition",
                target?.id === club.id ? "bg-blue-soft border border-blue/40" : "hover:bg-blue-faint",
              )}
              aria-pressed={target?.id === club.id}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold truncate">{club.name}</span>
                <span className="block text-ink-soft truncate">
                  {club.city} · {attachments(club)}
                </span>
              </span>
              {target?.id === club.id && <Check size={14} className="text-blue shrink-0" aria-hidden />}
            </button>
          ))}
          {candidates.length === 0 && (
            <p className="text-xs text-ink-soft text-center py-4">Aucun autre club ne correspond.</p>
          )}
        </div>

        {target && (
          <p className="text-xs bg-sun-soft rounded-lg px-3 py-2">
            <span className="font-bold">« {source.name} » sera supprimé</span> et ses rattachements passeront à
            « {target.name} ». Cette opération est définitive.
          </p>
        )}
        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
      </div>
    </BottomSheet>
  );
}

function ClubCard({
  club,
  clubs,
  onChanged,
}: {
  club: AdminClubDto;
  clubs: AdminClubDto[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Vide de tout : une saisie de test qu'on peut retirer sans rien déplacer
  const deletable = !club.hasAccount && club.teamsCount === 0 && club.coachesCount === 0;

  return (
    <div className="card p-5 space-y-3 animate-rise-in">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-paper flex items-center justify-center shrink-0">
          <Building2 size={18} className="text-blue" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold truncate">{club.name}</p>
          <p className="text-xs text-ink-soft truncate">
            {club.city}
            {club.ownerEmail ? ` · ${club.ownerEmail}` : ""}
          </p>
        </div>
      </div>

      <ClubChips club={club} />

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}

      {editing ? (
        <EditForm
          club={club}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            onChanged();
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
          <Button size="sm" variant="soft" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Corriger
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMerging(true)}>
            <GitMerge size={13} /> Fusionner
          </Button>
          {deletable &&
            (confirmDelete ? (
              <>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await api(`/admin/clubs/${club.id}`, { method: "DELETE" });
                      onChanged();
                    } catch (err) {
                      setError(err instanceof ApiError ? err.message : "Suppression impossible");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Trash2 size={13} /> Confirmer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Annuler
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={13} /> Supprimer
              </Button>
            ))}
        </div>
      )}

      {merging && (
        <MergeSheet source={club} clubs={clubs} onClose={() => setMerging(false)} onMerged={onChanged} />
      )}
    </div>
  );
}

/**
 * Un doublon détecté : deux écritures d'un même club, dans la même ville. On
 * garde celui qu'on désigne, les autres sont absorbés d'un geste — c'est le cas
 * pour lequel cet écran existe.
 */
function DuplicateGroup({ group, onMerged }: { group: AdminClubDto[]; onMerged: () => void }) {
  const [keeping, setKeeping] = useState<AdminClubDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mergeInto(target: AdminClubDto) {
    setBusy(true);
    setError(null);
    try {
      // Un appel par club absorbé, en série : chacun est une transaction, et
      // s'arrêter au premier refus laisse la base cohérente.
      for (const club of group) {
        if (club.id === target.id) continue;
        await api(`/admin/clubs/${target.id}/merge`, {
          method: "POST",
          body: JSON.stringify({ sourceId: club.id }),
        });
      }
      setKeeping(null);
      onMerged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Fusion impossible");
      onMerged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 space-y-3 border-sun/40">
      <div className="flex items-center gap-2">
        <TriangleAlert size={16} className="text-sun shrink-0" />
        <p className="text-sm font-black">
          {group.length} écritures à {group[0].city}
        </p>
      </div>
      <p className="text-xs text-ink-soft">
        Ces clubs se ressemblent beaucoup. S&apos;il s&apos;agit du même, gardez la bonne écriture : les autres
        seront supprimés et leurs équipes, coachs et demandes lui seront rattachés.
      </p>

      <div className="space-y-2">
        {group.map((club) => {
          const blocked = mergeBlockedReason(club, group);
          return (
            <div key={club.id} className="rounded-lg surface px-3 py-2.5 space-y-2">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{club.name}</p>
                <p className="text-xs text-ink-soft truncate">
                  {attachments(club)}
                  {club.hasAccount ? " · compte club" : ""}
                </p>
              </div>
              {blocked ? (
                <p className="text-[11px] text-ink-soft">{blocked}</p>
              ) : (
                <Button size="sm" variant="soft" disabled={busy} onClick={() => setKeeping(club)}>
                  <Check size={13} /> Garder celui-ci
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}

      {keeping && (
        <BottomSheet
          label="Confirmer la fusion"
          onClose={() => setKeeping(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setKeeping(null)}>
                Annuler
              </Button>
              <Button type="button" variant="danger" disabled={busy} onClick={() => mergeInto(keeping)}>
                <GitMerge size={14} /> Fusionner
              </Button>
            </div>
          }
        >
          <div className="p-5 pt-2 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-black">Garder « {keeping.name} »</h3>
              <p className="text-sm text-ink-soft">
                {group.length - 1} club{group.length > 2 ? "s" : ""} sera supprimé
                {group.length > 2 ? "s" : ""}, et tout ce qui s&apos;y rattache passera à « {keeping.name} ».
              </p>
            </div>
            <ul className="space-y-1.5">
              {group
                .filter((c) => c.id !== keeping.id)
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-xs bg-paper rounded-lg px-3 py-2">
                    <X size={13} className="text-coral shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold truncate">{c.name}</span>
                      <span className="block text-ink-soft truncate">{attachments(c)}</span>
                    </span>
                  </li>
                ))}
            </ul>
            <p className="text-[11px] text-ink-soft">Cette opération est définitive.</p>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<AdminClubDto[] | null>(null);
  const [duplicates, setDuplicates] = useState<AdminClubDuplicateGroupDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [all, groups] = await Promise.all([
        api<AdminClubDto[]>("/admin/clubs"),
        api<AdminClubDuplicateGroupDto[]>("/admin/clubs/duplicates"),
      ]);
      setClubs(all);
      setDuplicates(groups);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      (clubs ?? []).filter((c) =>
        q ? `${c.name} ${c.city} ${c.stadium ?? ""}`.toLowerCase().includes(q) : true,
      ),
    [clubs, q],
  );

  if (error && !clubs) {
    return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  }
  if (!clubs) return <CardGridSkeleton cards={4} />;

  return (
    <div className="space-y-4">
      <h2 className="display text-lg px-1">Clubs ({clubs.length})</h2>

      {duplicates.length > 0 && (
        <section className="space-y-3" aria-label="Doublons détectés">
          <h3 className="text-sm font-black px-1">
            Doublons à traiter ({duplicates.length})
          </h3>
          {duplicates.map((group) => (
            <DuplicateGroup key={group.clubs[0].id} group={group.clubs} onMerged={load} />
          ))}
        </section>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="field pl-11"
          placeholder="Rechercher un club, une ville…"
          aria-label="Rechercher un club"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-ink-soft text-center py-6">Aucun club ne correspond à « {query} ».</p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 items-start">
        {filtered.map((club) => (
          <ClubCard key={club.id} club={club} clubs={clubs} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

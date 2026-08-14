"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, Building2, Check, Copy, KeyRound, Mail, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import type {
  AdminAccountDto,
  AdminCreateClubResultDto,
  DeclaredClubDto,
  Role,
} from "@teamnexus/shared";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { timeAgo, useNow } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

const ROLE_META: Record<Role, { label: string; chip: string }> = {
  coach: { label: "Coach", chip: "bg-pitch-soft text-primary" },
  player: { label: "Joueur", chip: "bg-sky-soft text-sky" },
  parent: { label: "Parent", chip: "bg-tangerine-soft text-tangerine" },
  supporter: { label: "Supporter", chip: "bg-sun-soft text-sun" },
  admin: { label: "Admin", chip: "bg-navy-700 text-white" },
  // `navy-100` n'existe pas dans le thème : la pastille s'affichait sans fond
  club: { label: "Club", chip: "bg-blue-soft text-primary" },
};

// Mot de passe temporaire — visible UNE seule fois
function TempPasswordModal({ account, password, onClose }: { account: AdminAccountDto; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <BottomSheet
      label="Mot de passe temporaire"
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <div className="p-5 pt-2 space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-black">Mot de passe réinitialisé</h3>
          <p className="text-sm text-ink-soft">
            Transmettez ce mot de passe temporaire à{" "}
            <span className="font-bold">{account.nickname}</span>. Il ne sera plus affiché ensuite.
          </p>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={cn(
            "w-full flex items-center justify-center gap-2 min-h-14 font-mono font-black text-lg tracking-widest rounded-lg px-4 py-3 border transition active:scale-[0.98]",
            copied ? "bg-success-soft text-success border-success/30" : "bg-paper border-line hover:border-blue/40",
          )}
          aria-label="Copier le mot de passe temporaire"
        >
          {password}
          {copied ? <Check size={16} /> : <Copy size={16} className="text-ink-soft" />}
        </button>
        <p className="text-[11px] text-ink-soft">
          Toutes ses sessions ont été déconnectées. Il pourra changer ce mot de passe plus tard.
        </p>
      </div>
    </BottomSheet>
  );
}

function AccountCard({ account, onChanged }: { account: AdminAccountDto; onChanged: () => void }) {
  const now = useNow(60000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(account.email);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const meta = ROLE_META[account.role];
  const manageable = account.role !== "admin";
  const deletable = manageable && account.role !== "coach";

  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("card p-5 space-y-3 animate-rise-in", account.disabled && "opacity-75 border-coral/30")}>
      <div className="flex items-center gap-3">
        <Avatar name={account.nickname} size={44} />
        <div className="min-w-0 flex-1">
          {/* Le surnom en premier : c'est sous ce nom que le compte apparaît
              dans l'application. L'état civil, s'il existe, situe la personne. */}
          <p className="font-bold truncate">{account.nickname}</p>
          <p className="text-xs text-ink-soft truncate">
            {`${account.firstName} ${account.lastName}`.trim()
              ? `${`${account.firstName} ${account.lastName}`.trim()} · ${account.email}`
              : account.email}
          </p>
        </div>
        <span className={cn("chip shrink-0", meta.chip)}>{meta.label}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {account.teamName && <span className="chip bg-paper text-ink-soft">{account.teamName}</span>}
        <span className="chip bg-paper text-ink-soft">
          {account.lastLoginAt ? `Connecté ${timeAgo(account.lastLoginAt, now).toLowerCase()}` : "Jamais connecté"}
        </span>
        {account.disabled && (
          <span className="chip bg-coral-soft text-coral">
            <Ban size={11} /> Désactivé
          </span>
        )}
        {account.hasPendingReset && (
          <span className="chip bg-sun-soft text-sun">
            <KeyRound size={11} /> Réinitialisation demandée
          </span>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}

      {editingEmail && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action(async () => {
              await api(`/admin/accounts/${account.id}/email`, { method: "PATCH", body: JSON.stringify({ email }) });
              setEditingEmail(false);
              onChanged();
            });
          }}
          className="flex gap-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field flex-1"
            aria-label="Nouvel email"
          />
          <Button type="submit" size="sm" disabled={busy}>Enregistrer</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingEmail(false)}>
            <X size={14} />
          </Button>
        </form>
      )}

      {/* Grille de deux : les cinq actions se répartissaient en lignes ragées
          espacées de 6 px, sous le minimum de 8 px entre deux cibles. */}
      {manageable && !editingEmail && (
        <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
          <Button
            size="sm"
            variant={account.hasPendingReset ? "primary" : "soft"}
            disabled={busy}
            onClick={() =>
              action(async () => {
                const { tempPassword: pw } = await api<{ tempPassword: string }>(
                  `/admin/accounts/${account.id}/reset-password`,
                  { method: "POST" },
                );
                setTempPassword(pw);
                onChanged();
              })
            }
          >
            <KeyRound size={13} /> Réinitialiser
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditingEmail(true)}>
            <Mail size={13} /> Email
          </Button>
          {account.disabled ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await api(`/admin/accounts/${account.id}/enable`, { method: "POST" });
                  onChanged();
                })
              }
            >
              <RotateCcw size={13} /> Réactiver
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await api(`/admin/accounts/${account.id}/disable`, { method: "POST" });
                  onChanged();
                })
              }
            >
              <Ban size={13} /> Désactiver
            </Button>
          )}
          {deletable &&
            (confirmDelete ? (
              <>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await api(`/admin/accounts/${account.id}`, { method: "DELETE" });
                      onChanged();
                    })
                  }
                >
                  <Trash2 size={13} /> Confirmer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Annuler
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={13} /> Supprimer
              </Button>
            ))}
        </div>
      )}

      {tempPassword && (
        <TempPasswordModal account={account} password={tempPassword} onClose={() => setTempPassword(null)} />
      )}
    </div>
  );
}

/** Le CTA vit dans le pied de la feuille : il vise le formulaire à distance */
const CLUB_FORM_ID = "admin-new-club";

// Création d'un compte club : formulaire puis identifiants (affichés une fois)
function CreateClubModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    city: "",
    stadium: "",
    contactFirstName: "",
    contactLastName: "",
    email: "",
  });
  const [result, setResult] = useState<AdminCreateClubResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /**
   * Clubs déjà connus qui portent ce nom dans cette ville — souvent DÉCLARÉS par
   * un coach, donc sans compte. Leur ouvrir un compte doit REPRENDRE la ligne
   * existante : en créer une seconde laisserait les équipes déjà rattachées de
   * l'autre côté, invisibles du club.
   */
  const [similar, setSimilar] = useState<DeclaredClubDto[]>([]);
  const [claimed, setClaimed] = useState<DeclaredClubDto | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const name = form.name.trim();
  const city = form.city.trim();
  useEffect(() => {
    if (claimed || name.length < 2 || city.length < 1) {
      setSimilar([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const found = await api<DeclaredClubDto[]>(
          `/clubs/declared?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`,
          { signal: controller.signal },
        );
        setSimilar(found.filter((c) => !c.hasAccount));
      } catch {
        // Recherche indisponible : la création reste possible, sans la question.
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, city, claimed]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<AdminCreateClubResultDto>("/admin/clubs", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          stadium: form.stadium.trim() || undefined,
          claimClubId: claimed?.id,
        }),
      });
      setResult(res);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      label="Nouveau club"
      onClose={onClose}
      footer={
        result ? (
          <Button className="w-full" onClick={onClose}>
            Fermer
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" form={CLUB_FORM_ID} disabled={busy}>
              Créer le club
            </Button>
          </div>
        )
      }
    >
      <div className="p-5 pt-2 space-y-4">
        {result ? (
          <>
            <div className="space-y-1">
              <h3 className="text-base font-black">Club créé — {result.club.name}</h3>
              <p className="text-sm text-ink-soft">
                Transmettez ces identifiants au club. Le mot de passe ne sera plus affiché ensuite.
              </p>
            </div>
            <div className="bg-paper rounded-lg px-4 py-3 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Email de connexion</p>
              <p className="text-sm font-bold break-all">{result.ownerEmail}</p>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(result.tempPassword);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={cn(
                "w-full flex items-center justify-center gap-2 min-h-14 font-mono font-black text-lg tracking-widest rounded-lg px-4 py-3 border transition active:scale-[0.98]",
                copied ? "bg-success-soft text-success border-success/30" : "bg-paper border-line hover:border-blue/40",
              )}
              aria-label="Copier le mot de passe temporaire"
            >
              {result.tempPassword}
              {copied ? <Check size={16} /> : <Copy size={16} className="text-ink-soft" />}
            </button>
            <p className="text-[11px] text-ink-soft">
              Code d&apos;affiliation du club : <span className="font-mono font-bold">{result.club.affiliationCode}</span>
            </p>
          </>
        ) : (
          <form id={CLUB_FORM_ID} onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue" />
              <h3 className="text-base font-black">Nouveau club</h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft" htmlFor="club-name">Nom du club</label>
              <input id="club-name" required minLength={2} autoComplete="organization" autoCapitalize="words" enterKeyHint="next" value={form.name} onChange={(e) => set("name", e.target.value)} className="field" placeholder="Étoile Sportive" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft" htmlFor="club-city">Ville</label>
              <input id="club-city" required autoComplete="address-level2" autoCapitalize="words" enterKeyHint="next" value={form.city} onChange={(e) => set("city", e.target.value)} className="field" placeholder="Lyon" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft" htmlFor="club-stadium">Stade</label>
              <input id="club-stadium" autoCapitalize="words" enterKeyHint="next" maxLength={150} value={form.stadium} onChange={(e) => set("stadium", e.target.value)} className="field" placeholder="Stade municipal" />
              <p className="text-[11px] text-ink-soft">Repris par défaut sur les équipes rattachées à ce club.</p>
            </div>

            {/* La question du doublon : ce club a peut-être déjà été déclaré par
                un de ses coachs. Le reprendre garde ses équipes ; en créer un
                second les laisserait orphelines. */}
            {claimed ? (
              <div className="rounded-lg bg-blue-soft px-4 py-3 flex items-center gap-3">
                <Building2 size={18} className="text-blue shrink-0" />
                <span className="min-w-0 flex-1 text-xs">
                  <span className="block font-bold truncate">Reprise de « {claimed.name} »</span>
                  <span className="block text-ink-soft truncate">
                    Déjà déclaré à {claimed.city} — ses équipes suivront.
                  </span>
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setClaimed(null)}>
                  Annuler
                </Button>
              </div>
            ) : (
              similar.length > 0 && (
                <div className="rounded-lg bg-sun-soft px-4 py-3 space-y-2">
                  <p className="text-xs font-bold">Ce club existe peut-être déjà</p>
                  <p className="text-[11px] text-ink-soft">
                    Déclaré par un coach, sans compte de connexion. S&apos;il s&apos;agit du même, reprenez-le.
                  </p>
                  {similar.map((club) => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => setClaimed(club)}
                      className="w-full flex items-center gap-2 rounded-lg surface px-3 py-2 text-left text-xs
                        transition hover:bg-blue-faint"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold truncate">{club.name}</span>
                        <span className="block text-ink-soft truncate">
                          {club.city}
                          {club.stadium ? ` · ${club.stadium}` : ""}
                        </span>
                      </span>
                      <Check size={14} className="text-blue shrink-0" aria-hidden />
                    </button>
                  ))}
                </div>
              )
            )}
            {/* Une colonne au pouce : deux champs de nom côte à côte tombent
                sous 160 px de large sur un téléphone. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft" htmlFor="club-fn">Prénom du contact</label>
                <input id="club-fn" required autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" value={form.contactFirstName} onChange={(e) => set("contactFirstName", e.target.value)} className="field" placeholder="Camille" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft" htmlFor="club-ln">Nom du contact</label>
                <input id="club-ln" required autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" value={form.contactLastName} onChange={(e) => set("contactLastName", e.target.value)} className="field" placeholder="Direction" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft" htmlFor="club-email">Email de connexion</label>
              <input id="club-email" type="email" required inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" value={form.email} onChange={(e) => set("email", e.target.value)} className="field" placeholder="club@exemple.fr" />
            </div>
            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
          </form>
        )}
      </div>
    </BottomSheet>
  );
}

/** ?nouveau=1 (bouton « + » de la barre basse) ouvre la création, puis le paramètre est retiré */
function AdminAccounts() {
  const router = useRouter();
  const params = useSearchParams();
  const [accounts, setAccounts] = useState<AdminAccountDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creatingClub, setCreatingClub] = useState(false);

  // Ouverture par effet, pas par état initial : depuis la page elle-même, le
  // composant ne se remonte pas et l'état initial ne serait jamais relu.
  const wantsNew = params.get("nouveau") === "1";
  useEffect(() => {
    if (!wantsNew) return;
    setCreatingClub(true);
    router.replace("/admin/comptes");
  }, [wantsNew, router]);

  const load = useCallback(async () => {
    try {
      setAccounts(await api<AdminAccountDto[]>("/admin/accounts"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !accounts) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!accounts) return <CardGridSkeleton cards={4} />;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? accounts.filter((a) => `${a.nickname} ${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(q))
    : accounts;
  // Les demandes de réinitialisation en premier
  const sorted = [...filtered].sort((a, b) => Number(b.hasPendingReset) - Number(a.hasPendingReset));

  return (
    <div className="space-y-4">
      {/* La création passe par le « + » de la barre basse : plus de bouton en
          haut d'écran (visible ici seulement au-delà de 960 px, où la barre
          basse n'existe pas). */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-lg px-1">Comptes ({accounts.length})</h2>
        <Button size="sm" className="hidden min-[960px]:inline-flex" onClick={() => setCreatingClub(true)}>
          <Plus size={14} /> Nouveau club
        </Button>
      </div>

      {creatingClub && <CreateClubModal onClose={() => setCreatingClub(false)} onCreated={load} />}

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
          placeholder="Rechercher par nom ou email…"
          aria-label="Rechercher un compte"
        />
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-ink-soft text-center py-6">Aucun compte ne correspond à « {query} ».</p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 items-start">
        {sorted.map((a) => (
          <AccountCard key={a.id} account={a} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

export default function AdminAccountsPage() {
  return (
    <Suspense fallback={<CardGridSkeleton cards={4} />}>
      <AdminAccounts />
    </Suspense>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Plus, ShieldCheck, UserPlus, X } from "lucide-react";
import type {
  ClubAffiliationRequestDto,
  ClubCoachDto,
  ClubOverviewDto,
  CreateClubCoachResultDto,
} from "@footcoach/shared";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

function AffiliationCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
          <ShieldCheck size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Code d&apos;affiliation</p>
          <p className="text-xs text-ink-soft">
            Communiquez ce code à un coach déjà inscrit pour le rattacher à votre club (vous validez sa demande).
          </p>
        </div>
      </div>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={cn(
          "inline-flex items-center gap-2 font-mono font-black text-lg tracking-[0.25em] rounded-lg px-4 py-2 border transition",
          copied ? "bg-success-soft text-success border-success/30" : "bg-white border-line hover:border-blue/50",
        )}
        aria-label={`Copier le code ${code}`}
      >
        {code}
        {copied ? <Check size={15} className="text-success" /> : <Copy size={15} className="text-ink-soft" />}
      </button>
    </div>
  );
}

/** Le CTA vit dans le pied de la feuille : il vise le formulaire à distance */
const COACH_FORM_ID = "club-new-coach";

// Création d'un compte coach : formulaire puis identifiants (affichés une fois)
function CreateCoachModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [result, setResult] = useState<CreateClubCoachResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<CreateClubCoachResultDto>("/club/coaches", { method: "POST", body: JSON.stringify(form) });
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
      label="Nouveau coach"
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
            <Button type="submit" form={COACH_FORM_ID} disabled={busy}>
              Créer le coach
            </Button>
          </div>
        )
      }
    >
      <div className="p-5 pt-2 space-y-4">
        {result ? (
          <>
            <div className="space-y-1">
              <h3 className="text-base font-black">
                Coach créé — {result.coach.firstName} {result.coach.lastName}
              </h3>
              <p className="text-sm text-ink-soft">
                Transmettez ces identifiants au coach. Le mot de passe ne sera plus affiché ensuite.
              </p>
            </div>
            <div className="bg-paper rounded-lg px-4 py-3 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Email de connexion</p>
              <p className="text-sm font-bold break-all">{result.coach.email}</p>
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
          </>
        ) : (
          <form id={COACH_FORM_ID} onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-blue" />
              <h3 className="text-base font-black">Nouveau coach</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft" htmlFor="coach-fn">Prénom</label>
                <input id="coach-fn" required autoComplete="given-name" autoCapitalize="words" enterKeyHint="next" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="field" placeholder="Bruno" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft" htmlFor="coach-ln">Nom</label>
                <input id="coach-ln" required autoComplete="family-name" autoCapitalize="words" enterKeyHint="next" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="field" placeholder="Silva" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft" htmlFor="coach-email">Email de connexion</label>
              <input id="coach-email" type="email" required inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="field" placeholder="coach@exemple.fr" />
            </div>
            {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
          </form>
        )}
      </div>
    </BottomSheet>
  );
}

// Demandes d'affiliation en attente de validation par le club
function AffiliationRequestsCard({
  requests,
  onDecided,
}: {
  requests: ClubAffiliationRequestDto[];
  onDecided: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (requests.length === 0) return null;

  async function decide(id: string, decision: "approve" | "decline") {
    setBusy(id);
    setError(null);
    try {
      await api(`/club/affiliation-requests/${id}/${decision}`, { method: "POST" });
      onDecided();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-5 space-y-3 border-l-4 border-l-accent">
      <div className="flex items-center gap-2">
        <UserPlus size={16} className="text-sun" />
        <p className="text-sm font-black">
          {requests.length} demande{requests.length > 1 ? "s" : ""} d&apos;affiliation à valider
        </p>
      </div>
      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
      {/* Demandeur sur une ligne, décision sur la suivante : les deux boutons
          se partageaient sinon la centaine de pixels restante. */}
      {requests.map((r) => (
        <div key={r.id} className="bg-paper rounded-lg px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-navy-700 text-white flex items-center justify-center text-xs font-black shrink-0">
              {r.firstName[0]}
              {r.lastName[0] ?? ""}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">
                {r.firstName} {r.lastName}
              </p>
              <p className="text-xs text-ink-soft truncate">{r.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, "approve")}>
              <Check size={14} /> Accepter
            </Button>
            <Button size="sm" variant="danger" disabled={busy === r.id} onClick={() => decide(r.id, "decline")}>
              <X size={14} /> Refuser
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** ?nouveau=1 (bouton « + » de la barre basse) ouvre la création */
function ClubCoaches() {
  const router = useRouter();
  const params = useSearchParams();
  const [overview, setOverview] = useState<ClubOverviewDto | null>(null);
  const [coaches, setCoaches] = useState<ClubCoachDto[] | null>(null);
  const [requests, setRequests] = useState<ClubAffiliationRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Ouverture par effet, pas par état initial : depuis la page elle-même, le
  // composant ne se remonte pas et l'état initial ne serait jamais relu.
  const wantsNew = params.get("nouveau") === "1";
  useEffect(() => {
    if (!wantsNew) return;
    setCreating(true);
    router.replace("/club/coachs");
  }, [wantsNew, router]);

  const load = useCallback(async () => {
    try {
      const [ov, list, reqs] = await Promise.all([
        api<ClubOverviewDto>("/club/overview"),
        api<ClubCoachDto[]>("/club/coaches"),
        api<ClubAffiliationRequestDto[]>("/club/affiliation-requests"),
      ]);
      setOverview(ov);
      setCoaches(list);
      setRequests(reqs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>;
  if (!overview || !coaches) return <CardGridSkeleton cards={2} />;

  return (
    <div className="space-y-4">
      <AffiliationCodeCard code={overview.club.affiliationCode} />

      <AffiliationRequestsCard requests={requests} onDecided={load} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-lg px-1">Coachs ({coaches.length})</h2>
        {/* Au pouce, la création passe par le « + » de la barre basse */}
        <Button size="sm" className="hidden min-[960px]:inline-flex" onClick={() => setCreating(true)}>
          <Plus size={14} /> Nouveau coach
        </Button>
      </div>

      {creating && <CreateCoachModal onClose={() => setCreating(false)} onCreated={load} />}

      {coaches.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <span className="w-12 h-12 rounded-lg bg-pitch-soft text-pitch flex items-center justify-center mx-auto">
            <ShieldCheck size={22} />
          </span>
          <p className="text-sm text-ink-soft font-medium">Aucun coach affilié pour l&apos;instant.</p>
          <p className="text-xs text-ink-soft">
            Créez un compte coach, ou partagez le code d&apos;affiliation à un coach déjà inscrit.
          </p>
          <Button className="w-full sm:w-auto" onClick={() => setCreating(true)}>
            <Plus size={15} /> Nouveau coach
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 items-start">
          {coaches.map((coach) => (
            <div key={coach.id} className="card p-5 space-y-3 animate-rise-in">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-navy-700 text-white flex items-center justify-center text-sm font-black shrink-0">
                  {coach.firstName[0]}
                  {coach.lastName[0] ?? ""}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">
                    {coach.firstName} {coach.lastName}
                  </p>
                  <p className="text-xs text-ink-soft truncate">{coach.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {coach.teams.length === 0 ? (
                  <span className="chip bg-paper text-ink-soft">Aucune équipe affectée</span>
                ) : (
                  coach.teams.map((t) => (
                    <span key={t.id} className="chip bg-pitch-soft text-primary">
                      {t.name}
                      {t.role === "adjoint" ? " (adjoint)" : ""}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClubCoachesPage() {
  return (
    <Suspense fallback={<CardGridSkeleton cards={2} />}>
      <ClubCoaches />
    </Suspense>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Contact, Phone, QrCode, ScanLine, Trash2, UserPlus } from "lucide-react";
import { parseCoachQr, type CoachRelationDto } from "@footcoach/shared";
import { ApiError, api } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { QrScanner } from "@/components/matches/QrScanner";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/ui/Skeleton";

/**
 * Réseau du coach : les confrères avec qui il garde le contact. Le lien se crée
 * en saisissant leur code coach ou en scannant le QR de leur profil.
 */
export default function CoachRelationsPage() {
  const [relations, setRelations] = useState<CoachRelationDto[] | null>(null);
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRelations(await api<CoachRelationDto[]>("/coach/relations"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addByCode = useCallback(
    async (rawCode: string) => {
      const value = rawCode.trim().toUpperCase();
      if (!value || busy) return;
      setBusy(true);
      setError(null);
      setAdded(null);
      try {
        const relation = await api<CoachRelationDto>("/coach/relations", {
          method: "POST",
          body: JSON.stringify({ code: value }),
        });
        setAdded(`${relation.firstName} ${relation.lastName} a rejoint vos relations`);
        setCode("");
        await load();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Ajout impossible");
      } finally {
        setBusy(false);
      }
    },
    [busy, load],
  );

  const onScan = useCallback(
    (payload: string) => {
      setScanning(false);
      const scanned = parseCoachQr(payload);
      if (!scanned) {
        setError("Ce QR code n'est pas un code coach FootCoach");
        return;
      }
      addByCode(scanned);
    },
    [addByCode],
  );

  async function remove(coachId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/coach/relations/${coachId}`, { method: "DELETE" });
      setConfirmRemove(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex flex-wrap items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
          <Contact size={22} />
        </span>
        <div className="min-w-[14rem] flex-1">
          <h2 className="display text-lg">Mes relations</h2>
          <p className="text-xs text-white/80">
            Les coachs avec qui vous gardez le contact — leur numéro reste entre vous.
          </p>
        </div>
      </div>

      {/* Ajout : scan du QR, ou saisie du code */}
      <section className="card p-5 space-y-3" aria-label="Ajouter un coach">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
            <UserPlus size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="display text-lg leading-none">Ajouter un coach</h3>
            <p className="text-xs text-ink-soft">Scannez son QR code, ou saisissez son code coach.</p>
          </div>
        </div>

        <Button className="w-full" onClick={() => setScanning(true)} disabled={busy}>
          <ScanLine size={16} /> Scanner son QR code
        </Button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addByCode(code);
          }}
          className="flex items-end gap-2"
        >
          <div className="space-y-1.5 flex-1 min-w-0">
            <label htmlFor="coach-code" className="text-xs font-bold text-ink-soft">Code coach</label>
            <input
              id="coach-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="field font-mono tracking-widest"
              placeholder="AB2CD3"
              maxLength={12}
            />
          </div>
          <Button type="submit" disabled={busy || code.trim().length < 4}>
            Ajouter
          </Button>
        </form>

        <p className="text-[11px] text-ink-soft">
          Votre propre code se trouve dans{" "}
          <Link href="/coach/profile" className="font-bold text-blue hover:underline">
            votre profil
          </Link>
          , avec le QR à faire scanner.
        </p>

        {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
        {added && <p className="text-xs font-semibold text-success bg-success-soft rounded-lg px-3 py-2">{added}</p>}
      </section>

      {/* Liste des relations */}
      {!relations ? (
        <CardGridSkeleton cards={2} />
      ) : relations.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <span className="w-12 h-12 rounded-lg bg-blue-soft text-blue flex items-center justify-center mx-auto">
            <QrCode size={22} />
          </span>
          <p className="text-sm font-bold">Aucune relation pour l&apos;instant</p>
          <p className="text-xs text-ink-soft">
            Échangez vos codes coach après un match : vous garderez le contact pour les prochains amicaux.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {relations.map((relation) => (
            <div key={relation.id} className="card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar
                  firstName={relation.firstName}
                  lastName={relation.lastName}
                  avatarUrl={relation.avatarUrl}
                  size={48}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">
                    {relation.firstName} {relation.lastName}
                  </p>
                  {relation.teams.length > 0 && (
                    <p className="text-xs text-ink-soft truncate">
                      {relation.teams.map((t) => t.name).join(" · ")} — {relation.teams[0].city}
                    </p>
                  )}
                  {relation.clubName && (
                    <p className="text-xs text-ink-soft truncate flex items-center gap-1.5">
                      <Building2 size={11} className="shrink-0" /> {relation.clubName}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(confirmRemove === relation.id ? null : relation.id)}
                  aria-label={`Retirer ${relation.firstName} ${relation.lastName} de mes relations`}
                  className="p-2 rounded-lg text-ink-faint hover:text-coral hover:bg-coral-soft transition shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {relation.phone ? (
                <a
                  href={`tel:${relation.phone.replace(/[^+0-9]/g, "")}`}
                  className="flex items-center gap-2.5 bg-paper rounded-lg px-4 py-2.5 text-sm hover:bg-blue-faint transition"
                >
                  <Phone size={14} className="text-blue shrink-0" />
                  <span className="font-bold flex-1 truncate">{relation.phone}</span>
                  <span className="text-xs text-ink-soft shrink-0">Appeler</span>
                </a>
              ) : (
                <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-2.5">
                  Numéro non renseigné par ce coach.
                </p>
              )}

              {confirmRemove === relation.id && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-ink-soft flex-1">Retirer cette relation des deux côtés ?</p>
                  <Button size="sm" variant="danger" onClick={() => remove(relation.id)} disabled={busy}>
                    Retirer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(null)}>
                    Annuler
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {scanning && <QrScanner onResult={onScan} onClose={() => setScanning(false)} />}
    </div>
  );
}

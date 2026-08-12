"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, CalendarPlus, Copy, ExternalLink, Link2Off } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

/**
 * Liaison de l'agenda FootCoach au calendrier du téléphone.
 *
 * Un seul bouton : on génère l'URL d'abonnement ICS côté serveur, puis on ouvre
 * ce que l'appareil sait ouvrir — le lien webcal:// sur iPhone/Mac (l'app
 * Calendrier propose l'abonnement), la page d'ajout de Google Agenda ailleurs.
 * Le calendrier relit ensuite le flux tout seul ; il n'y a rien d'autre à faire.
 */

/** Réponse des routes /calendar/link : chemin du flux, null si non lié */
interface CalendarLinkDto {
  path: string | null;
}

function webcalUrl(path: string): string {
  return `webcal://${window.location.host}${path}`;
}

function httpsUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

/** L'app Calendrier d'Apple gère webcal:// nativement ; ailleurs, Google Agenda */
function isApplePlatform(): boolean {
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
}

function openInPhoneCalendar(path: string) {
  if (isApplePlatform()) {
    window.location.href = webcalUrl(path);
  } else {
    const url = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl(path))}`;
    window.open(url, "_blank", "noopener");
  }
}

export function CalendarSyncCard() {
  const [path, setPath] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CalendarLinkDto>("/calendar/link")
      .then((link) => setPath(link.path))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  async function link() {
    setBusy(true);
    setError(null);
    try {
      const created = await api<CalendarLinkDto>("/calendar/link", { method: "POST" });
      setPath(created.path);
      if (created.path) openInPhoneCalendar(created.path);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Liaison impossible");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    if (!window.confirm("Délier l'agenda ? Le calendrier de votre téléphone n'affichera plus vos matchs FootCoach.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/calendar/link", { method: "DELETE" });
      setPath(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Déliaison impossible");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(httpsUrl(path));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible dans ce navigateur");
    }
  }

  return (
    <section className="card p-5 space-y-3" aria-label="Agenda du téléphone">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
          {path ? <CalendarCheck2 size={18} /> : <CalendarPlus size={18} />}
        </span>
        <div className="min-w-0">
          <h3 className="display text-lg leading-none">Agenda du téléphone</h3>
          <p className="text-xs text-ink-soft">Vos matchs dans le calendrier de votre appareil.</p>
        </div>
      </div>

      {!loaded ? (
        <p className="text-xs text-ink-soft animate-soft-pulse">Vérification…</p>
      ) : path ? (
        <>
          <p className="text-xs font-semibold text-success bg-success-soft rounded-lg px-4 py-3">
            Agenda lié. Votre calendrier se met à jour tout seul — comptez de une à quelques heures selon
            l&apos;application.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="ghost" className="w-full" onClick={() => openInPhoneCalendar(path)} disabled={busy}>
              <ExternalLink size={15} /> Rouvrir dans le calendrier
            </Button>
            <Button variant="ghost" className="w-full" onClick={copyUrl} disabled={busy}>
              <Copy size={15} /> {copied ? "Lien copié" : "Copier le lien d'abonnement"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={unlink} disabled={busy}>
              <Link2Off size={15} /> Délier l&apos;agenda
            </Button>
          </div>
          <p className="text-[11px] text-ink-soft">
            Le lien copié sert aux autres calendriers (Outlook, Proton…) : ajoutez-y un « calendrier par
            URL ». Ce lien est personnel — ne le partagez pas.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs text-ink-soft">
            Matchs, entraînements et tournois de vos équipes apparaissent dans le calendrier de votre
            téléphone et s&apos;y mettent à jour automatiquement. Un ajout suffit, valable pour de bon.
          </p>
          <Button className="w-full" onClick={link} disabled={busy}>
            <CalendarPlus size={16} /> {busy ? "Liaison…" : "Lier à mon agenda"}
          </Button>
        </>
      )}

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
    </section>
  );
}

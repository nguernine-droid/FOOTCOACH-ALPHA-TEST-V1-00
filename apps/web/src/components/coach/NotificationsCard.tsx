"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Share } from "lucide-react";
import type { NotificationPrefsDto, UserDto } from "@footcoach/shared";
import { ApiError, api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { checkAvailability, subscribe, unsubscribe, type PushAvailability } from "@/lib/push";
import { cn } from "@/lib/utils";

const TOGGLES: { key: keyof NotificationPrefsDto; label: string; hint: string }[] = [
  {
    key: "newAnnouncement",
    label: "Nouvelle annonce dans mon périmètre",
    hint: "Une équipe cherche un adversaire près de chez vous",
  },
  {
    key: "announcementResponse",
    label: "Une équipe veut jouer mon annonce",
    hint: "Une proposition attend votre décision",
  },
  {
    key: "responseDecision",
    label: "Réponse à ma proposition",
    hint: "Votre proposition est acceptée ou déclinée",
  },
  { key: "score", label: "Score à valider", hint: "L'adversaire a saisi le score final" },
  { key: "message", label: "Message d'un coach", hint: "Un confrère vous écrit dans une conversation" },
];

/** Interrupteur pleine largeur : toute la ligne est cliquable */
function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 min-h-14 py-2.5 cursor-pointer select-none transition",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-5 h-5 shrink-0 accent-blue"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-[11px] text-ink-soft">{hint}</span>
      </span>
    </label>
  );
}

/**
 * Activation des notifications push et choix de ce qui les déclenche.
 *
 * L'état est volontairement explicite : un coach qui ne voit pas le réglage
 * doit comprendre pourquoi (navigateur incapable, app pas installée sur iOS,
 * serveur sans clés, autorisation refusée) plutôt que de trouver un écran vide.
 */
export function NotificationsCard({ user, onChange }: { user: UserDto; onChange: (u: UserDto) => void }) {
  const [availability, setAvailability] = useState<PushAvailability | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefs: NotificationPrefsDto = user.notifications ?? {
    newAnnouncement: true,
    announcementResponse: true,
    responseDecision: true,
    score: true,
    message: true,
  };

  useEffect(() => {
    checkAvailability().then(setAvailability);
  }, []);

  async function toggleDevice(on: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (on) setAvailability(await subscribe());
      else {
        await unsubscribe();
        setAvailability({ state: "ready", subscribed: false });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Activation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function savePrefs(next: NotificationPrefsDto) {
    onChange({ ...user, notifications: next });
    await api<UserDto>("/me/notifications", { method: "PUT", body: JSON.stringify(next) })
      .then(onChange)
      .catch(() => setError("Préférence non enregistrée"));
  }

  const subscribed = availability?.state === "ready" && availability.subscribed;

  const header = (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
        {subscribed ? <Bell size={18} /> : <BellOff size={18} />}
      </span>
      <div className="min-w-0">
        <h3 className="display text-lg leading-none">Notifications</h3>
        <p className="text-xs text-ink-soft">Être prévenu même quand l&apos;app est fermée.</p>
      </div>
    </div>
  );

  // Cas où l'activation est impossible : on explique, on ne masque pas
  if (availability && availability.state !== "ready") {
    const explanation = {
      "needs-install": (
        <>
          <p className="text-sm font-bold">Ajoutez FootCoach à votre écran d&apos;accueil</p>
          <p className="text-xs text-ink-soft">
            Sur iPhone, les notifications ne sont possibles qu&apos;une fois l&apos;app installée. Dans Safari,
            touchez <Share size={12} className="inline align-[-2px]" /> puis « Sur l&apos;écran d&apos;accueil »,
            et revenez ici.
          </p>
        </>
      ),
      unsupported: (
        <>
          <p className="text-sm font-bold">Ce navigateur ne gère pas les notifications</p>
          <p className="text-xs text-ink-soft">Essayez depuis Chrome, Edge, Firefox ou Safari à jour.</p>
        </>
      ),
      "not-configured": (
        <>
          <p className="text-sm font-bold">Notifications indisponibles sur ce serveur</p>
          <p className="text-xs text-ink-soft">
            Les clés d&apos;envoi ne sont pas configurées. Rien à faire de votre côté.
          </p>
        </>
      ),
      denied: (
        <>
          <p className="text-sm font-bold">Notifications bloquées</p>
          <p className="text-xs text-ink-soft">
            Vous les avez refusées pour ce site. Réautorisez-les dans les réglages de votre navigateur, puis
            revenez sur cette page.
          </p>
        </>
      ),
    }[availability.state];

    return (
      <section className="card p-5 space-y-3" aria-label="Notifications">
        {header}
        <div className="rounded-lg bg-paper px-4 py-3 space-y-1">{explanation}</div>
      </section>
    );
  }

  return (
    <section className="card p-5 space-y-4" aria-label="Notifications">
      {header}

      {!availability ? (
        <p className="text-xs text-ink-soft animate-soft-pulse">Vérification…</p>
      ) : subscribed ? (
        <>
          <p className="text-xs font-semibold text-success bg-success-soft rounded-lg px-4 py-3">
            Cet appareil recevra les notifications choisies ci-dessous.
          </p>
          <div className="divide-y divide-line border-y border-line">
            {TOGGLES.map((t) => (
              <Toggle
                key={t.key}
                label={t.label}
                hint={t.hint}
                checked={prefs[t.key]}
                onChange={(value) => savePrefs({ ...prefs, [t.key]: value })}
              />
            ))}
          </div>
          <p className="text-[11px] text-ink-soft">
            « Nouvelle annonce » utilise le périmètre réglé sur votre radar
            {user.radarRadiusKm ? ` (${user.radarRadiusKm} km)` : " (sans limite)"}.
          </p>
          <Button variant="ghost" className="w-full" onClick={() => toggleDevice(false)} disabled={busy}>
            <BellOff size={15} /> Désactiver sur cet appareil
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-ink-soft">
            Recevez une alerte quand une équipe cherche un adversaire près de chez vous, ou quand une
            proposition attend votre réponse.
          </p>
          <Button className="w-full" onClick={() => toggleDevice(true)} disabled={busy}>
            <Bell size={16} /> {busy ? "Activation…" : "Activer les notifications"}
          </Button>
        </>
      )}

      {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Camera, ChevronRight, Copy, LogOut, Mail, QrCode, Trash2, Trophy, Users } from "lucide-react";
import { coachQrPayload, type CoachCategory, type UserDto } from "@footcoach/shared";
import { ApiError, api, getStoredUser, logout, updateStoredUser } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { CoachCategoryPicker } from "@/components/coach/CoachCategoryPicker";
import { LocationCard } from "@/components/coach/LocationCard";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function CoachProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(() => getStoredUser());
  const [form, setForm] = useState(() => {
    const stored = getStoredUser();
    return {
      nickname: stored?.nickname ?? "",
      firstName: stored?.firstName ?? "",
      lastName: stored?.lastName ?? "",
      phone: stored?.phone ?? "",
      licenseNumber: stored?.licenseNumber ?? "",
    };
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // La session stockée peut dater d'avant l'ajout de la position ou des
  // préférences de notification : on relit la fiche au montage.
  useEffect(() => {
    api<UserDto>("/me")
      .then((fresh) => {
        setUser(fresh);
        updateStoredUser(fresh);
      })
      .catch(() => undefined);
  }, []);

  if (!user) return <Skeleton className="h-96" />;

  function apply(updated: UserDto) {
    setUser(updated);
    updateStoredUser(updated);
  }

  /**
   * Casquettes : cochées et décochées à l'unité, enregistrées immédiatement.
   * Pas de bouton « Enregistrer » — c'est un interrupteur, et un interrupteur
   * qu'il faut confirmer laisse croire qu'on l'a actionné alors que non.
   */
  async function toggleCategory(category: CoachCategory) {
    const current = user?.categories ?? [];
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    await saveCategories(next);
  }

  /**
   * Retour au coach simple. Déjà simple, l'appel est épargné : la case cochée
   * qu'on recoche ne doit pas faire clignoter un message d'enregistrement.
   */
  async function clearCategories() {
    if ((user?.categories ?? []).length === 0) return;
    await saveCategories([]);
  }

  async function saveCategories(categories: CoachCategory[]) {
    setError(null);
    setMessage(null);
    try {
      apply(await api<UserDto>("/me/categories", { method: "PATCH", body: JSON.stringify({ categories }) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible");
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api<UserDto>("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          phone: form.phone.trim() || null,
          // `null` et non `undefined` : c'est ce qui distingue « effacé » de
          // « non modifié » côté serveur.
          licenseNumber: form.licenseNumber.trim() || null,
        }),
      });
      apply(updated);
      setMessage("Profil enregistré");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image trop lourde (2 Mo maximum)");
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("avatar", file);
      apply(await api<UserDto>("/me/avatar", { method: "POST", body }));
      setMessage("Photo mise à jour");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi impossible");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setUploading(true);
    setError(null);
    try {
      apply(await api<UserDto>("/me/avatar", { method: "DELETE" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Suppression impossible");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <h2 className="display text-lg px-1">Mon profil</h2>

      {/* Photo + identité */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.nickname} avatarUrl={user.avatarUrl} size={72} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-base font-black truncate">
              {user.nickname}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="soft" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Camera size={13} /> {user.avatarUrl ? "Changer la photo" : "Ajouter une photo"}
              </Button>
              {user.avatarUrl && (
                <Button size="sm" variant="ghost" onClick={removeAvatar} disabled={uploading}>
                  <Trash2 size={13} /> Retirer
                </Button>
              )}
            </div>
            <p className="text-[11px] text-ink-soft">JPEG, PNG ou WebP — 2 Mo maximum.</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAvatar(file);
          }}
        />

        <form onSubmit={saveProfile} className="space-y-4 border-t border-line pt-4">
          {/* Le surnom d'abord : c'est LE nom que les autres coachs voient.
              L'état civil suit, facultatif — il ne sort jamais du compte. */}
          <div className="space-y-1.5">
            <label htmlFor="nickname" className="text-xs font-bold text-ink-soft">Surnom</label>
            <input
              id="nickname"
              required
              maxLength={30}
              autoComplete="nickname"
              enterKeyHint="next"
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              className="field"
              placeholder="Coach Alex"
            />
            <p className="text-[11px] text-ink-faint font-semibold">
              C&apos;est le nom que les autres coachs voient — partout.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-xs font-bold text-ink-soft">
                Prénom <span className="text-ink-faint font-semibold">(facultatif)</span>
              </label>
              <input
                id="firstName"
                autoComplete="given-name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="field"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-xs font-bold text-ink-soft">
                Nom <span className="text-ink-faint font-semibold">(facultatif)</span>
              </label>
              <input
                id="lastName"
                autoComplete="family-name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="field"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-bold text-ink-soft">Téléphone</label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="field"
              placeholder="06 12 34 56 78"
            />
            <p className="text-[11px] text-ink-soft">
              Visible uniquement par les coachs de vos relations.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="licenseNumber" className="text-xs font-bold text-ink-soft">
              Numéro de licence (optionnel)
            </label>
            <input
              id="licenseNumber"
              autoComplete="off"
              autoCapitalize="characters"
              enterKeyHint="done"
              maxLength={30}
              value={form.licenseNumber}
              onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
              className="field"
              placeholder="2543678901"
            />
            <p className="text-[11px] text-ink-soft">
              Votre licence d&apos;éducateur. Contrairement au téléphone, elle n&apos;est visible que de vous —
              videz le champ pour l&apos;effacer.
            </p>
          </div>

          {error && (
            <p className="animate-message text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {message && (
            <p className="animate-message text-xs font-semibold text-success bg-success-soft rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </section>

      <LocationCard user={user} onChange={apply} />

      {/* Les notifications se réglaient ici : elles sont parties dans
          Paramètres, avec l'apparence. Ce n'étaient pas des informations sur le
          coach mais des réglages de l'application sur cet appareil. La ligne
          reste pour ceux qui les cherchent à leur ancienne place. */}
      <Link
        href="/coach/settings"
        className="card p-5 flex items-center gap-3 transition hover:bg-blue-faint active:bg-blue-soft"
      >
        <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
          <Bell size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Notifications et apparence</span>
          <span className="block text-xs text-ink-soft">Réglées dans Paramètres.</span>
        </span>
        <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
      </Link>

      {/* Code coach + QR à faire scanner */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
            <QrCode size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="display text-lg leading-none">Mon code coach</h3>
            <p className="text-xs text-ink-soft">À dicter ou à faire scanner pour vous ajouter en relation.</p>
          </div>
        </div>

        {user.coachCode ? (
          <div className="flex flex-col items-center gap-3">
            <QrCodeCanvas value={coachQrPayload(user.coachCode)} label="Mon QR code coach" />
            <div className="flex items-center gap-2">
              <span className="display text-3xl tracking-[0.3em] text-primary">{user.coachCode}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(user.coachCode!).then(
                    () => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    },
                    () => undefined,
                  );
                }}
                aria-label="Copier mon code coach"
                className="icon-btn text-ink-soft hover:text-blue hover:bg-blue-soft"
              >
                <Copy size={18} />
              </button>
            </div>
            {copied && <p className="text-xs font-bold text-success">Code copié</p>}
          </div>
        ) : (
          <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
            Votre code sera généré à votre prochaine connexion.
          </p>
        )}
      </section>

      {/* Trois options pour deux casquettes : « Coach simple » dit le cas
          ordinaire au lieu de le laisser deviner. Les deux vraies restent
          cumulables entre elles. */}
      {user.categories !== undefined && (
        <section className="card p-5 space-y-3" aria-label="Mes casquettes">
          <div className="space-y-1">
            <h3 className="display text-lg">Mes casquettes</h3>
            <p className="text-xs text-ink-soft">
              Facultatives, et cumulables entre elles. Chaque changement est enregistré aussitôt.
            </p>
          </div>
          <CoachCategoryPicker
            value={user.categories ?? []}
            onToggle={toggleCategory}
            onClear={clearCategories}
          />
        </section>
      )}

      {/* Palier : le seul endroit où le total chiffré est montré, et seulement
          à son propriétaire. Ailleurs, seul le palier circule. */}
      {user.level && (
        <section className="card p-5 space-y-3" aria-label="Palier">
          <div className="flex items-center justify-between gap-3">
            <h3 className="display text-lg">Palier</h3>
            <span className="chip bg-accent-surface text-accent shrink-0">
              <Trophy size={11} aria-hidden /> {user.level.name}
            </span>
          </div>
          <p className="text-xs text-ink-soft">
            {user.points ?? 0} points gagnés en validant vos rencontres au stade, face au coach adverse.
          </p>
          {user.level.next != null ? (
            <>
              {/* Progression dans le palier courant, pas depuis zéro : c'est le
                  chemin qui reste qui motive, pas le total accumulé. */}
              <div
                className="h-2 rounded-full bg-paper overflow-hidden"
                role="progressbar"
                aria-valuemin={user.level.min}
                aria-valuemax={user.level.next}
                aria-valuenow={user.points ?? 0}
              >
                <div
                  className="h-full bg-accent-solid rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((((user.points ?? 0) - user.level.min) / (user.level.next - user.level.min)) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-ink-soft">
                Encore {user.level.next - (user.points ?? 0)} points avant le palier suivant.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-ink-soft">Vous êtes au palier le plus haut.</p>
          )}
        </section>
      )}

      {/* Compte */}
      <section className="card p-5 space-y-3">
        <h3 className="display text-lg">Compte</h3>
        <p className="flex items-center gap-2.5 bg-paper rounded-lg px-4 py-2.5 text-sm">
          <Mail size={14} className="text-blue shrink-0" />
          <span className="font-semibold truncate">{user.email}</span>
        </p>
        {user.teamName && (
          <p className="flex items-center gap-2.5 bg-paper rounded-lg px-4 py-2.5 text-sm">
            <Users size={14} className="text-blue shrink-0" />
            <span className="font-semibold truncate">{user.teamName}</span>
          </p>
        )}
        <Button
          variant="danger"
          className="w-full"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <LogOut size={15} /> Se déconnecter
        </Button>
      </section>
    </div>
  );
}

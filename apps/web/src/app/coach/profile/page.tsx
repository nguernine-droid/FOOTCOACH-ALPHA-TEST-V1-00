"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Copy, LogOut, Mail, QrCode, Trash2, Users } from "lucide-react";
import { coachQrPayload, type UserDto } from "@footcoach/shared";
import { ApiError, api, getStoredUser, logout, updateStoredUser } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { QrCodeCanvas } from "@/components/QrCodeCanvas";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function CoachProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(() => getStoredUser());
  const [form, setForm] = useState(() => {
    const stored = getStoredUser();
    return { firstName: stored?.firstName ?? "", lastName: stored?.lastName ?? "", phone: stored?.phone ?? "" };
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return <Skeleton className="h-96" />;

  function apply(updated: UserDto) {
    setUser(updated);
    updateStoredUser(updated);
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
        body: JSON.stringify({ ...form, phone: form.phone.trim() || null }),
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
          <Avatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} size={72} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-base font-black truncate">
              {user.firstName} {user.lastName}
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-xs font-bold text-ink-soft">Prénom</label>
              <input
                id="firstName"
                required
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="field"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-xs font-bold text-ink-soft">Nom</label>
              <input
                id="lastName"
                required
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
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="field"
              placeholder="06 12 34 56 78"
            />
            <p className="text-[11px] text-ink-soft">
              Visible uniquement par les coachs de vos relations.
            </p>
          </div>

          {error && <p className="text-xs font-semibold text-coral bg-coral-soft rounded-lg px-3 py-2">{error}</p>}
          {message && <p className="text-xs font-semibold text-success bg-success-soft rounded-lg px-3 py-2">{message}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </section>

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
              <span className="display text-3xl tracking-[0.3em] text-navy-700">{user.coachCode}</span>
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
            <span className="font-semibold truncate">
              {user.teamName}
              {user.clubName ? ` · ${user.clubName}` : ""}
            </span>
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

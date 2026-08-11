"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bug, ChevronRight, CircleUserRound, Palette, Settings } from "lucide-react";
import type { UserDto } from "@footcoach/shared";
import { api, getStoredUser, updateStoredUser } from "@/lib/api";
import { NotificationsCard } from "@/components/coach/NotificationsCard";
import { ThemePicker } from "@/components/ThemePicker";
import { Skeleton } from "@/components/ui/Skeleton";

/** Adresse de contact du service, la même que sur le site public */
const CONTACT = "contact@footcoach.fr";

/**
 * Réglages de l'application, rassemblés hors de la feuille « Moi ».
 *
 * Celle-ci mélangeait des destinations (mes annonces, mes relations) et des
 * réglages (apparence, profil) ; les seconds y prenaient la place des
 * premières, alors qu'on ne les ouvre presque jamais. Ils vivent donc ici, à un
 * seul geste de la feuille, et elle retrouve sa vocation : aller quelque part.
 */
export default function CoachSettingsPage() {
  const [user, setUser] = useState<UserDto | null>(() => getStoredUser());
  /**
   * Le canevas du signalement est enrichi APRÈS le montage. Lire le navigateur
   * pendant le rendu donnerait un lien différent côté serveur et côté client, et
   * React signalerait la divergence — pour un attribut qui n'a de sens que sur
   * l'appareil du coach.
   */
  const [report, setReport] = useState(() => reportUrl(""));

  // La session stockée peut dater d'avant les préférences de notification :
  // c'est cette page qui les règle, elle doit partir de l'état réel.
  useEffect(() => {
    api<UserDto>("/me")
      .then((fresh) => {
        setUser(fresh);
        updateStoredUser(fresh);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setReport(reportUrl(`\n\n---\nAppareil : ${navigator.userAgent}\nÉcran : ${window.innerWidth} px`));
  }, []);

  /** Une fiche à jour se range aussi dans la session, comme au profil */
  function apply(updated: UserDto) {
    setUser(updated);
    updateStoredUser(updated);
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Settings size={22} />
        </span>
        <div>
          <h2 className="display text-lg">Paramètres</h2>
          <p className="text-xs text-white/85">L&apos;apparence, les notifications, votre profil.</p>
        </div>
      </div>

      {/* L'apparence en tête : c'est le seul réglage dont on voit l'effet sans
          quitter l'écran, et celui qu'on vient régler le premier. */}
      <section className="card p-5 space-y-3" aria-label="Apparence">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
            <Palette size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="display text-lg">Apparence</h3>
            <p className="text-xs text-ink-soft">Clair, sombre, ou celle de votre téléphone.</p>
          </div>
        </div>
        <ThemePicker />
      </section>

      {/* Les notifications viennent d'ici et non plus de « Mon profil » : ce
          sont des réglages de l'application sur CET appareil, pas des
          informations sur le coach. */}
      {user ? <NotificationsCard user={user} onChange={apply} /> : <Skeleton className="h-48 rounded-card" />}

      <LinkCard
        href="/coach/profile"
        icon={<CircleUserRound size={18} />}
        title="Mon profil"
        hint="Votre surnom, votre photo, votre position, vos casquettes et votre code coach."
      />

      {/* Un lien `mailto` plutôt qu'un formulaire : en phase de test, un
          message qui arrive dans une boîte se lit et se répond le jour même,
          là où un formulaire demanderait une table, un écran d'administration
          et quelqu'un pour l'ouvrir. Le sujet et le canevas sont préremplis —
          un rapport sans « ce que j'attendais » se répond par une question. */}
      <a
        href={report}
        className="card p-5 flex items-center gap-3 transition hover:bg-blue-faint active:bg-blue-soft"
      >
        <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
          <Bug size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Signaler un bug ou une suggestion</span>
          <span className="block text-xs text-ink-soft">
            Ouvre votre messagerie, vers {CONTACT}. Tout est lu.
          </span>
        </span>
        <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
      </a>
    </div>
  );
}

function LinkCard({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link href={href} className="card p-5 flex items-center gap-3 transition hover:bg-blue-faint active:bg-blue-soft">
      <span className="w-9 h-9 rounded-lg bg-blue-soft text-blue flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-xs text-ink-soft">{hint}</span>
      </span>
      <ChevronRight size={16} className="text-ink-faint shrink-0" aria-hidden />
    </Link>
  );
}

/**
 * Le lien de signalement, avec son canevas. Le bloc technique ne porte que
 * l'appareil — rien qui identifie le coach : c'est sa messagerie qui dira qui
 * écrit, ce n'est pas à nous de glisser son identité dans une URL.
 *
 * Un vrai `href` plutôt qu'un `onClick` : il se copie, s'ouvre au clavier et
 * dans un nouvel onglet, ce qu'un gestionnaire de clic ne sait pas faire.
 */
function reportUrl(context: string): string {
  const body =
    "Ce que je faisais :\n\n" + "Ce qui s'est passé :\n\n" + "Ce que j'attendais :\n" + context;
  return `mailto:${CONTACT}?subject=${encodeURIComponent("FootCoach — bug ou suggestion")}&body=${encodeURIComponent(body)}`;
}

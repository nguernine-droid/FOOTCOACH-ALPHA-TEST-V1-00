"use client";

import { ArrowLeft, CalendarDays, Navigation, Scale, Sparkles, Users } from "lucide-react";
import {
  DIVISION_LEVEL_LABELS,
  MATCH_GENDER_LABELS,
  categoryLabel,
  type AnnouncementSuggestionDto,
} from "@teamnexus/shared";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";
import { ReliabilityBadge } from "@/components/ReliabilityBadge";
import { Button } from "@/components/ui/Button";

/**
 * ————— L'écran qui s'intercale entre « Valider » et la publication —————
 *
 * Un coach remplissait son annonce, la publiait, et attendait. Cet écran
 * renverse le sens : au moment où il valide, on lui montre les équipes qui
 * cherchent DÉJÀ le même match. Le rendez-vous existait, il ne le savait pas.
 *
 * Trois principes le gouvernent, et ils passent avant toute considération
 * d'affichage :
 *
 * 1. **Il n'empêche jamais de publier.** « Publier mon annonce » est présent,
 *    entier, à un geste — pas caché derrière un « non merci » en petits
 *    caractères. Un raccourci qu'on ne prend pas doit laisser la route ouverte.
 * 2. **Il n'apparaît que s'il a quelque chose à dire.** Sans correspondance, le
 *    client publie directement : on n'ajoute pas un écran pour annoncer qu'on
 *    n'a rien trouvé.
 * 3. **Il dit pourquoi.** Chaque carte porte les faits qui l'ont classée là —
 *    la distance, l'écart de date, l'écart de niveau. Un classement qu'on ne
 *    peut pas contredire n'est pas une aide, c'est un oracle.
 */

/**
 * L'écart de date en toutes lettres. « 2 jours plus tôt » se comprend d'un
 * regard là où « J-2 » demande de reconstituer par rapport à quoi.
 */
function dateGapLabel(days: number): string {
  if (days === 0) return "le jour même";
  if (days === -1) return "la veille";
  if (days === 1) return "le lendemain";
  return days < 0 ? `${-days} jours plus tôt` : `${days} jours plus tard`;
}

/**
 * Ce qui a mis cette annonce là où elle est — les faits, pas le score.
 *
 * Le score lui-même ne s'affiche jamais. « 87 » ne veut rien dire pour un
 * coach : il ne peut ni le vérifier ni le contester, et un nombre sur une
 * équipe ressemblerait à une note attribuée au club. Les faits qui le
 * composent, eux, se vérifient d'un coup d'œil.
 */
function reasons(s: AnnouncementSuggestionDto): { icon: React.ReactNode; text: string }[] {
  const out: { icon: React.ReactNode; text: string }[] = [];
  if (s.breakdown.distanceKm !== null) {
    out.push({
      icon: <Navigation size={12} aria-hidden />,
      text: `à ${s.breakdown.distanceKm.toLocaleString("fr-FR")} km`,
    });
  }
  out.push({ icon: <CalendarDays size={12} aria-hidden />, text: dateGapLabel(s.breakdown.dateGapDays) });
  // L'écart de niveau ne se dit que lorsqu'il est CONNU : afficher « niveau
  // inconnu » sur trois cartes sur cinq remplirait l'écran d'une information
  // qui n'en est pas une.
  if (s.breakdown.levelGap === 0) {
    out.push({ icon: <Scale size={12} aria-hidden />, text: "même niveau" });
  } else if (s.breakdown.levelGap !== null && s.breakdown.levelGap >= 2) {
    // Dit franchement quand le match risque d'être déséquilibré. Le taire
    // ferait accepter une correction, et une correction ne se rejoue pas.
    out.push({ icon: <Scale size={12} aria-hidden />, text: "niveau assez écarté" });
  }
  return out;
}

function SuggestionCard({
  suggestion: s,
  busy,
  disabled,
  onAccept,
}: {
  suggestion: AnnouncementSuggestionDto;
  busy: boolean;
  disabled: boolean;
  onAccept: (announcementId: string) => void;
}) {
  const a = s.announcement;
  return (
    <div className="rounded-lg border border-line p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "w-10 h-10 rounded-full overflow-hidden text-white flex items-center justify-center text-xs font-black shrink-0",
              a.team.logoUrl ? "bg-paper" : teamColor(a.team),
            )}
          >
            {a.team.logoUrl ? (
              <img src={a.team.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              teamInitials(a.team.name)
            )}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{a.team.name}</p>
            <p className="text-xs text-ink-soft truncate">{a.team.city}</p>
          </div>
        </div>
        <ReliabilityBadge reliability={a.reliability} />
      </div>

      {/* Pourquoi cette équipe est proposée : la ligne qui rend le classement
          discutable au lieu de le faire subir. */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-ink-soft">
        {reasons(s).map((r, i) => (
          <span key={i} className="flex items-center gap-1">
            {r.icon}
            {r.text}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {a.plateau && (
          <span className="chip bg-accent-surface text-accent">
            <Users size={11} /> Plateau ·{" "}
            {a.teamsWanted - a.teamsAccepted > 0
              ? `${a.teamsWanted - a.teamsAccepted} place${a.teamsWanted - a.teamsAccepted > 1 ? "s" : ""}`
              : "complet"}
          </span>
        )}
        <span className="chip bg-pitch-soft text-primary">{categoryLabel(a.category)}</span>
        {a.preciseCategory && (
          <span className="chip bg-sun-soft text-sun">{categoryLabel(a.preciseCategory)} uniquement</span>
        )}
        {a.gender && <span className="chip bg-pitch-soft text-primary">{MATCH_GENDER_LABELS[a.gender]}</span>}
        <span className="chip bg-pitch-soft text-primary">{a.format}</span>
        {a.level && <span className="chip bg-paper text-ink-soft">{DIVISION_LEVEL_LABELS[a.level]}</span>}
      </div>

      {/* La date et le lieu de LEUR annonce en toutes lettres : accepter, c'est
          jouer chez eux, à leur heure — pas au créneau qu'on venait de saisir. */}
      <p className="text-xs font-semibold text-ink-soft capitalize flex items-center gap-1.5">
        <CalendarDays size={13} className="text-pitch" aria-hidden /> {formatDate(a.date)} à {a.time} —{" "}
        <span className="normal-case">
          {a.stadium}, {a.city}
        </span>
      </p>

      {a.comment && (
        <div className="text-xs bg-paper rounded-lg px-4 py-3 space-y-0.5">
          <p className="font-bold text-ink-soft">Informations pratiques</p>
          <p className="text-ink-soft">{a.comment}</p>
        </div>
      )}

      <Button className="w-full" onClick={() => onAccept(a.id)} disabled={disabled}>
        {busy ? "Envoi…" : "Proposer de jouer"}
      </Button>
    </div>
  );
}

export function SuggestedOpponents({
  items,
  totalFound,
  busy,
  error,
  onAccept,
  onPublish,
  onBack,
}: {
  items: AnnouncementSuggestionDto[];
  totalFound: number;
  /** L'identifiant de l'annonce en cours d'acceptation, "publish" pour la publication simple, sinon null */
  busy: string | null;
  error: string | null;
  onAccept: (announcementId: string) => void;
  onPublish: () => void;
  /**
   * Revenir au formulaire. ABSENT quand l'annonce est déjà partie en base —
   * après une proposition qui a échoué, par exemple : proposer de « modifier »
   * un texte déjà publié promettrait une correction qui n'aurait pas lieu.
   */
  onBack?: () => void;
}) {
  const working = busy !== null;
  return (
    <div className="space-y-4">
      <div className="hero-pitch p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="display text-lg">
            {items.length === 1
              ? "Une équipe cherche déjà ce match"
              : `${items.length} équipes cherchent déjà ce match`}
          </h2>
          <p className="text-xs text-white/85">
            Avant de publier, voici ce qui existe. Proposer de jouer va plus vite qu&apos;attendre.
          </p>
        </div>
      </div>

      {/* Ne jamais laisser croire que la liste est exhaustive quand elle ne
          l'est pas : le coach doit savoir qu'il en reste, et où les trouver. */}
      {totalFound > items.length && (
        <p className="text-xs text-ink-soft bg-paper rounded-lg px-4 py-3">
          {totalFound} annonces correspondent — voici les{" "}
          <strong>{items.length} plus proches de votre demande</strong>. Les autres resteront sur votre
          radar.
        </p>
      )}

      {error && <p className="text-sm font-semibold text-coral bg-coral-soft rounded-lg px-4 py-3">{error}</p>}

      <div className="card p-4 space-y-3 animate-rise-in">
        {items.map((s) => (
          <SuggestionCard
            key={s.announcement.id}
            suggestion={s}
            busy={busy === s.announcement.id}
            disabled={working}
            onAccept={onAccept}
          />
        ))}
      </div>

      {/* ————— La sortie, entière —————
          « Publier mon annonce » fait exactement ce que le coach avait demandé
          en validant. Il n'est ni grisé, ni relégué : c'est l'action qu'il
          venait faire, et les propositions ne sont qu'une occasion offerte en
          chemin. */}
      <div className="card p-5 space-y-3">
        <p className="text-xs text-ink-soft">
          Aucune ne convient ? Publiez la vôtre : elle partira sur le radar de tous les coachs du secteur.
        </p>
        <Button variant="soft" size="lg" className="w-full" onClick={onPublish} disabled={working}>
          {busy === "publish" ? "Publication…" : "Publier mon annonce"}
        </Button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={working}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue py-2
              disabled:opacity-40 disabled:pointer-events-none"
          >
            <ArrowLeft size={14} aria-hidden /> Modifier mon annonce
          </button>
        )}
      </div>

      {/* Dit AVANT le geste, pas après : proposer de jouer publie aussi
          l'annonce, et un coach doit savoir ce qu'il déclenche. Le filet a une
          raison précise — la validation est double, et une proposition peut ne
          jamais aboutir. */}
      <p className="text-[11px] text-ink-faint px-1">
        Proposer de jouer publie également votre annonce : le match n&apos;est convenu que lorsque les deux
        coachs ont validé, et vous ne devez pas vous retrouver sans rien en ligne si celui-ci décline.
      </p>
    </div>
  );
}

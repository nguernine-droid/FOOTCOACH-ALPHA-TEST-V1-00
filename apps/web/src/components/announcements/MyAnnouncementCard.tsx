"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  ChevronRight,
  Eye,
  MapPin,
  MessageCircle,
  Pencil,
  Radar,
  ShieldCheck,
  Trash2,
  UserMinus,
} from "lucide-react";
import {
  announcementCategoryLabel,
  categoryLabel,
  teamMatchesAnnouncement,
  MATCH_GENDER_LABELS,
  WITHDRAWAL_REASON_LABELS,
  type AnnouncementDto,
  type AnnouncementResponseDto,
} from "@teamnexus/shared";
import { todayIso } from "@/lib/time";
import { cn, formatDate } from "@/lib/utils";
import { teamColor, teamInitials } from "@/components/MatchCard";

/**
 * Une de mes annonces, avec ses propositions à valider.
 * Partagé entre la page « Annonces » et la carte du tableau de bord —
 * `showLocation` densifie l'affichage sur la page dédiée.
 */
export function MyAnnouncementCard({
  announcement: a,
  onCancel,
  showLocation = false,
  onOpenDetail,
}: {
  announcement: AnnouncementDto;
  onCancel: (announcementId: string) => void;
  showLocation?: boolean;
  /**
   * Ouvre le détail complet. Fourni, il remplace le lien vers la feuille de
   * match qui enveloppait la carte : une carte entièrement cliquable qui
   * contient elle-même des boutons est un piège — on vise « Décliner » et on
   * change d'écran.
   */
  onOpenDetail?: () => void;
}) {
  const pending = a.responses.filter((r) => r.status === "pending");
  // La date est passée : le serveur a retiré l'annonce du radar et refuse les
  // propositions.
  const past = a.date < todayIso();
  // Rouge/orange/vert, d'un coup d'œil : personne n'a répondu, quelqu'un a
  // répondu (à trancher), ou c'est validé. Le SOS reste prioritaire — un
  // adversaire qui se désiste est plus urgent qu'une simple absence de réponse.
  const hasResponse = pending.length > 0;

  const body = (
    <div
      className={cn(
        "rounded-lg border border-line surface px-4 py-3 border-l-4 space-y-1.5 transition",
        a.status === "open" &&
          (a.isSos ? "border-l-coral" : hasResponse ? "border-l-sun" : "border-l-coral"),
        a.status === "matched" && "border-l-success hover:bg-blue-faint",
        a.status === "cancelled" && "border-l-ink-faint opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold capitalize">
          {announcementCategoryLabel(a)}
          {a.gender && ` ${MATCH_GENDER_LABELS[a.gender]}`} · {a.format} · {formatDate(a.date)} à {a.time}
        </p>
        {/* Combien d'AUTRES coachs ont ouvert le détail — un signal d'intérêt,
            même sans proposition reçue. */}
        <span
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-ink-faint"
          title="Nombre de fois où d'autres coachs ont ouvert le détail"
        >
          <Eye size={12} aria-hidden /> {a.viewCount}
        </span>
      </div>

      {showLocation && (
        <p className="text-xs text-ink-soft font-semibold flex items-center gap-1.5">
          <MapPin size={12} className="text-blue shrink-0" aria-hidden />
          <span className="truncate">
            {a.stadium}, {a.city}
          </span>
        </p>
      )}

      {/* Deux coachs qui cherchent le même jour dans la même catégorie sont, à
          eux deux, un match. On le dit ici pour que l'attente ne soit pas
          passive : il y a quelqu'un à appeler, tout de suite. */}
      {a.status === "open" && !past && a.sameDayRivals > 0 && (
        <Link
          href="/coach/radar"
          className="flex items-start gap-2 rounded-lg bg-blue-soft px-3 py-2 text-xs font-bold text-primary
            transition hover:bg-blue-faint"
        >
          <Radar size={13} className="shrink-0 mt-px" aria-hidden />
          <span>
            {a.sameDayRivals} équipe{a.sameDayRivals > 1 ? "s" : ""} cherche
            {a.sameDayRivals > 1 ? "nt" : ""} aussi un match ce jour-là
            <span className="block font-semibold text-ink-soft">
              Même catégorie, dans votre secteur — proposez-leur de jouer.
            </span>
          </span>
        </Link>
      )}

      {/* Adversaire désisté : l'annonce est repartie en tête du radar */}
      {a.status === "open" && a.isSos && (
        <p className="rounded-lg bg-coral-soft px-3 py-2 text-xs font-bold text-coral flex items-start gap-2">
          <UserMinus size={13} className="shrink-0 mt-px" aria-hidden />
          <span>
            SOS — {a.plateau ? "équipe désistée" : "adversaire désisté"}
            {a.sosReason && ` (${WITHDRAWAL_REASON_LABELS[a.sosReason].toLowerCase()})`}
            <span className="block font-semibold text-ink-soft">
              Remise en tête du radar, les coachs du secteur ont été alertés.
            </span>
          </span>
        </p>
      )}

      {/* Plus de pastille de conformité FFF : le délai de déclaration est
          rappelé une fois pour toutes dans les CGU acceptées à l'inscription.
          Reste la seule information que la carte est seule à porter — l'annonce
          n'est plus sur le radar parce que sa date est derrière nous. */}
      {past && a.status === "open" && (
        <div className="flex flex-wrap gap-1.5">
          <span className="chip bg-paper text-ink-soft">
            <CalendarX size={11} /> Date passée
          </span>
        </div>
      )}

      {a.status === "open" && (
        <>
          <div className="flex items-center justify-between gap-2">
            {past ? (
              // Sans cette ligne, l'annonce restait « en attente de proposition »
              // pour toujours, sans dire qu'elle ne cherchait plus personne.
              <p className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ink-faint shrink-0" aria-hidden />
                Retirée du radar — la date est passée
              </p>
            ) : (
              <p className={cn("text-xs font-semibold flex items-center gap-1.5", hasResponse ? "text-sun" : "text-coral")}>
                <span
                  className={cn(
                    "w-2 h-2 rounded-full animate-soft-pulse shrink-0",
                    hasResponse ? "bg-sun" : "bg-coral",
                  )}
                  aria-hidden
                />
                {/* Un plateau se remplit équipe par équipe : dire où il en est,
                    c'est dire pourquoi l'annonce est encore ouverte. */}
                {pending.length > 0
                  ? `${pending.length} proposition${pending.length > 1 ? "s" : ""} à valider${
                      a.plateau ? ` — ${a.teamsAccepted}/${a.teamsWanted} équipes` : ""
                    }`
                  : a.plateau
                    ? `Plateau — ${a.teamsAccepted} équipe${a.teamsAccepted > 1 ? "s" : ""} sur ${a.teamsWanted}`
                    : "En attente de proposition"}
              </p>
            )}
            <div className="flex items-center -mr-2">
              <Link
                href={`/coach/announcements/${a.id}/edit`}
                className="icon-btn text-ink-faint hover:text-blue hover:bg-blue-soft"
                aria-label="Modifier cette annonce"
              >
                <Pencil size={16} />
              </Link>
              <button
                onClick={() => onCancel(a.id)}
                className="icon-btn text-ink-faint hover:text-coral hover:bg-coral-soft"
                aria-label="Annuler cette annonce"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {/* Adversaire sur une ligne, décision sur la suivante : les deux
              boutons tenaient sinon dans une centaine de pixels. */}
          {!past &&
            pending.map((r) => (
              <div key={r.id} className="bg-paper rounded-lg px-3 py-2.5 mt-1.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-7 h-7 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0",
                      teamColor(r.team),
                    )}
                  >
                    {teamInitials(r.team.name)}
                  </span>
                  <span className="flex-1 min-w-0 text-xs font-bold truncate">
                    {r.team.name}
                    <span className="text-ink-soft font-semibold"> · {r.team.city}</span>
                  </span>
                </div>
                <ResponseFit response={r} announcement={a} />
                {/* Un match demande DEUX validations : dire laquelle manque
                    évite de croire qu'on attend l'autre quand c'est soi. */}
                <p className="text-[11px] font-semibold text-sun">
                  {r.ownerConfirmed && !r.responderConfirmed
                    ? "Vous avez validé — en attente de ce coach"
                    : r.responderConfirmed && !r.ownerConfirmed
                      ? "Ce coach a validé — il ne manque que vous"
                      : "À valider par vous deux"}
                </p>
                {r.conversationId ? (
                  <Link
                    href={`/coach/messages/${r.conversationId}`}
                    className="flex items-center justify-center gap-1.5 min-h-9 rounded-lg bg-blue-soft
                      text-xs font-bold text-primary transition hover:bg-blue-faint"
                  >
                    <MessageCircle size={14} aria-hidden /> Discuter et valider
                  </Link>
                ) : (
                  <p className="text-[11px] text-ink-soft">Discussion indisponible pour cette proposition.</p>
                )}
              </div>
            ))}
        </>
      )}

      {a.status === "matched" && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-success flex items-center gap-1.5">
            <CheckCircle2 size={12} className="shrink-0" />
            {a.plateauReduced
              ? // L'heure est passée sans que le carré se remplisse : le plateau
                // se joue à effectif réduit, comme le font les clubs plutôt que
                // de renvoyer les enfants à la maison. Dire « complet » ici
                // serait faux, et dire « incomplet » laisserait croire qu'il est
                // tombé à l'eau.
                // Compté en équipes PRÉSENTES, la mienne incluse — c'est ce qu'on
                // voit au bord du terrain, là où `teamsWanted` compte celles
                // qu'il restait à trouver.
                `Plateau réduit — ${a.teamsAccepted + 1} équipes au total au lieu de ${a.teamsWanted + 1}`
              : a.plateau
                ? `Plateau complet — ${a.teamsWanted + 1} équipes`
                : `Match confirmé — ${a.opponentTeam ? `${a.opponentTeam.name} (${a.opponentTeam.city})` : "adversaire trouvé"}`}
          </p>
          {a.plateauReduced && (
            <p className="text-[11px] text-ink-soft">
              Il se joue tel quel : scannez le QR de rencontre sur place, les points sont les mêmes.
            </p>
          )}
        </div>
      )}

      {a.status === "cancelled" && <p className="text-xs font-semibold text-ink-faint">Annonce annulée</p>}

      {onOpenDetail && (
        <button
          type="button"
          onClick={onOpenDetail}
          className="w-full min-h-11 -mb-1 flex items-center justify-between gap-2 rounded-lg px-1
            text-xs font-bold text-blue transition hover:bg-blue-faint active:bg-blue-soft"
        >
          Détail et participants
          <ChevronRight size={14} aria-hidden />
        </button>
      )}
    </div>
  );

  return a.status === "matched" && a.matchId && !onOpenDetail ? (
    <Link href={`/coach/matches/${a.matchId}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * Ce que l'équipe qui propose joue, en face de ce que l'annonce demande.
 * L'écart n'est jamais bloquant — un U13 peut vouloir se frotter à des U15, et
 * lui seul en juge. Mais il doit le SAVOIR avant de cliquer « Accepter » : sans
 * cette ligne, l'écart ne se découvrait qu'au coup d'envoi.
 *
 * Rien d'affiché quand l'équipe qui propose ne porte aucune référence : elle a
 * été créée avant que la question soit posée, et l'inconnu n'est pas un écart.
 */
function ResponseFit({
  response,
  announcement,
}: {
  response: AnnouncementResponseDto;
  announcement: AnnouncementDto;
}) {
  const fit = teamMatchesAnnouncement(
    { category: response.teamCategory, gender: response.teamGender },
    announcement,
  );
  if (!fit) return null;

  const references = [
    response.teamCategory ? categoryLabel(response.teamCategory) : null,
    response.teamGender ? MATCH_GENDER_LABELS[response.teamGender] : null,
  ].filter((v): v is string => v !== null);
  // Accord écrit à la main : « catégorie » est féminin, « genre » masculin, et
  // les deux ensemble prennent le masculin pluriel. Une phrase assemblée par
  // pluriel automatique donnait « genre différente ».
  const gap =
    !fit.category && !fit.gender
      ? "catégorie et genre différents de votre annonce"
      : !fit.category
        ? "catégorie différente de votre annonce"
        : !fit.gender
          ? "genre différent de votre annonce"
          : null;

  return (
    <p className={cn("text-[11px] flex items-start gap-1.5", gap ? "font-bold text-coral" : "text-ink-soft")}>
      {gap ? (
        <AlertTriangle size={11} className="shrink-0 mt-0.5" aria-hidden />
      ) : (
        <ShieldCheck size={11} className="shrink-0 mt-0.5 text-success" aria-hidden />
      )}
      <span>
        {references.join(" · ")}
        {gap && ` — ${gap}`}
      </span>
    </p>
  );
}

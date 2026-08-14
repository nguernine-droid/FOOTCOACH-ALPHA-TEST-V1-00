"use client";

import {
  categoryLabel,
  COACH_CATEGORY_LABELS,
  DIVISION_LEVEL_LABELS,
  type CoachCategory,
  type CoachLevelDto,
  type DivisionLevel,
} from "@teamnexus/shared";
import { Avatar } from "@/components/Avatar";

/**
 * Carte du coach, dans l'esprit des cartes de joueur.
 *
 * La correspondance avec ces cartes-là est volontaire, parce qu'elle est déjà
 * lue par tout le monde : les points tiennent la place de la note, la catégorie
 * d'âge celle du poste, la photo occupe le centre, et les compteurs se rangent
 * sous un trait. Le palier n'est PAS mis en haut à gauche : cette place appelle
 * un nombre, et « NOU » pour Nouveau ne veut rien dire.
 *
 * Format portrait fixe (rapport 5/7, celui d'une carte à jouer) : c'est lui qui
 * fait lire l'objet comme une carte plutôt que comme une fiche. Elle ne s'étire
 * donc pas en largeur, elle reste centrée.
 */
export function CoachCard({
  name,
  avatarUrl,
  clubLabel,
  clubLogoUrl,
  teamCategory,
  teamLevel,
  level,
  points,
  matchesPlayed,
  categories,
}: {
  /** Surnom du coach — la seule identité que la carte montre */
  name: string;
  avatarUrl: string | null;
  /** Club du coach, ou à défaut son équipe active — le libellé est décidé par l'appelant */
  clubLabel: string | null;
  /** Écusson de son équipe, affiché devant le libellé (null s'il n'y en a pas) */
  clubLogoUrl?: string | null;
  /** Catégorie d'âge de l'équipe active (U13…), null si elle n'en a pas */
  teamCategory: string | null;
  /** Niveau de jeu de l'équipe active (D2, R1…), null si non réglé */
  teamLevel?: DivisionLevel | null;
  level: CoachLevelDto;
  points: number;
  matchesPlayed: number;
  categories: CoachCategory[];
}) {
  return (
    <div
      className="relative w-full max-w-[340px] mx-auto aspect-[5/7] rounded-2xl overflow-hidden
        text-on-structure shadow-pop select-none"
      style={{
        // Dégradé posé ici et non en classe : la carte est la seule surface de
        // l'application à mêler le navy de la structure et l'or de l'accent.
        backgroundImage:
          "linear-gradient(160deg, var(--structure-3) 0%, var(--structure-1) 45%, var(--structure-2) 100%)",
      }}
    >
      {/* Liseré doré : ce qui distingue une carte d'un simple encadré sombre */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-2xl border-2 pointer-events-none"
        style={{ borderColor: "color-mix(in srgb, var(--accent-solid) 55%, transparent)" }}
      />
      {/* Halo derrière la photo, pour détacher le portrait du fond */}
      <span
        aria-hidden
        className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full blur-2xl"
        style={{ background: "color-mix(in srgb, var(--accent-solid) 22%, transparent)" }}
      />

      {/* Bandeau gauche : les points en gros, la catégorie dessous — la place
          qu'occupent la note et le poste sur une carte de joueur. Hors du flux
          centré, sinon il pousserait le portrait vers le bas. */}
      <div className="absolute left-5 top-5 text-center leading-none z-10">
        <p className="display text-4xl tabular-nums text-accent-solid">{points}</p>
        <p className="mt-0.5 text-[10px] font-black tracking-widest text-white/55">PTS</p>
        {teamCategory && (
          <p className="mt-2 text-xs font-black tracking-wider text-white/75">
            {categoryLabel(teamCategory).toUpperCase()}
            {teamLevel && ` · ${DIVISION_LEVEL_LABELS[teamLevel].toUpperCase()}`}
          </p>
        )}
      </div>

      {/* Bloc centré verticalement plutôt qu'empilé depuis le haut : avec deux
          compteurs seulement, un empilement laissait un tiers de carte vide en
          pied, ce qui la faisait lire comme inachevée. */}
      <div className="relative h-full flex flex-col items-center justify-center px-5 py-5">
        {/* Anneau doré autour du portrait, posé par un cadre plutôt que par une
            bordure : `Avatar` fixe déjà son propre style pour ses dimensions. */}
        {/* Cadre en `flex` : il supprime l'espace de ligne de base sous la photo,
            et surtout on ne passe AUCUNE classe d'affichage à `Avatar` — un
            `block` y écraserait le `flex` qui centre les initiales. */}
        <span
          className="rounded-full p-[3px] shadow-lg shrink-0 flex"
          style={{
            backgroundImage:
              "linear-gradient(160deg, var(--accent-solid-bright) 0%, color-mix(in srgb, var(--accent-solid) 45%, transparent) 100%)",
          }}
        >
          <Avatar name={name} avatarUrl={avatarUrl} size={176} />
        </span>

        <div className="mt-5 w-full text-center min-w-0">
          <p className="display text-2xl leading-tight truncate">{name}</p>
          {clubLabel && (
            // L'écusson devant le nom du club, quand il y en a un : c'est ce
            // qui fait ressembler la carte à celle d'un joueur.
            <p className="text-[11px] font-bold tracking-wider text-white/60 truncate uppercase flex items-center justify-center gap-1.5">
              {clubLogoUrl && (
                <img
                  src={clubLogoUrl}
                  alt=""
                  className="w-4 h-4 rounded-sm object-cover shrink-0"
                />
              )}
              {clubLabel}
            </p>
          )}
        </div>

        {/* Trait doré : la césure classique entre l'identité et les compteurs */}
        <span
          aria-hidden
          className="mt-4 h-px w-24"
          style={{ background: "color-mix(in srgb, var(--accent-solid) 60%, transparent)" }}
        />

        <dl className="mt-4 w-full grid grid-cols-2 gap-2 text-center">
          <Stat label="Matchs" value={String(matchesPlayed)} />
          <Stat label="Palier" value={level.name} />
        </dl>

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {categories.map((category) => (
              <span
                key={category}
                className="rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider uppercase
                  bg-white/10 border border-white/20"
              >
                {COACH_CATEGORY_LABELS[category]}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Le DOS de la même carte : le QR à faire scanner, et le code en toutes lettres
 * dessous pour les jours où l'appareil photo d'en face ne veut rien savoir.
 *
 * Mêmes dimensions et même habillage que le recto — c'est une seule carte qu'on
 * retourne, pas deux objets qui se succèdent. Le QR est posé sur une plaque
 * blanche : un code sombre sur fond sombre ne se scanne pas.
 */
export function CoachCardBack({
  name,
  coachCode,
  children,
}: {
  name: string;
  coachCode: string | null;
  /** Le QR lui-même, rendu par l'appelant (composant client) */
  children?: React.ReactNode;
}) {
  return (
    <div
      className="relative w-full max-w-[340px] mx-auto aspect-[5/7] rounded-2xl overflow-hidden
        text-on-structure shadow-pop select-none flex flex-col items-center justify-center gap-4 px-6"
      style={{
        backgroundImage:
          "linear-gradient(160deg, var(--structure-3) 0%, var(--structure-1) 45%, var(--structure-2) 100%)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-2xl border-2 pointer-events-none"
        style={{ borderColor: "color-mix(in srgb, var(--accent-solid) 55%, transparent)" }}
      />

      <div className="text-center space-y-1">
        <p className="display text-lg leading-none">Ajoutez-moi</p>
        <p className="text-[11px] font-semibold text-white/60">{name}</p>
      </div>

      {coachCode ? (
        <>
          <div className="rounded-xl bg-white p-3">{children}</div>
          <div className="text-center">
            <p className="display text-2xl tracking-[0.3em] text-accent-solid">{coachCode}</p>
            <p className="mt-1 text-[10px] font-bold tracking-wider text-white/50 uppercase">Code coach</p>
          </div>
        </>
      ) : (
        <p className="text-xs text-white/70 text-center">
          Votre code sera généré à votre prochaine connexion.
        </p>
      )}
    </div>
  );
}

/** Un compteur du pied de carte. La valeur est une chaîne : « 12 » comme « Argent ». */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-black tracking-widest text-white/55 uppercase">{label}</dt>
      <dd className="display text-2xl tabular-nums leading-none text-accent-solid truncate">{value}</dd>
    </div>
  );
}

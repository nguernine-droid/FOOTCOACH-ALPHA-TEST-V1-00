/**
 * Marqueur « maillot » de la carte des matchs proches.
 *
 * PLACEHOLDER — pictogramme de substitution, en attendant l'asset définitif
 * (voir la liste des assets à fournir).
 *
 * `seeking` (doré) distingue les équipes en recherche urgente d'adversaire —
 * un SOS après désistement — des annonces ordinaires. Le maillot est ancré par
 * sa pointe basse : c'est ce point-là qui porte la position exacte, et l'ombre
 * elliptique est posée dessous pour qu'on le lise ainsi.
 *
 * Remplissage et contour viennent de jetons : c'est ce qui permet au même
 * dessin de tenir sur le fond clair du jour comme sur celui de la nuit, sans
 * avoir deux fichiers à maintenir en parallèle.
 */
export function JerseyPin({
  variant,
  count,
  emphasis,
}: {
  variant: "free" | "seeking";
  /** Nombre d'annonces réunies sous ce maillot (≥ 2 seulement) */
  count?: number;
  /** Maillot mis en avant : celui dont la fiche est ouverte */
  emphasis?: boolean;
}) {
  const body = variant === "seeking" ? "var(--pin-seeking)" : "var(--pin-free)";
  const ink = "var(--pin-stroke)";
  return (
    <svg
      viewBox="0 0 32 40"
      width={32}
      height={40}
      aria-hidden
      focusable="false"
      style={{ overflow: "visible" }}
    >
      {/* Ombre au sol, sous la pointe du maillot */}
      <ellipse cx="16" cy="37" rx="9" ry="3" fill="var(--pin-shadow)" />

      <g style={{ filter: emphasis ? "var(--pin-emphasis)" : "var(--pin-lift)" }}>
        {/* Corps du maillot, épaules et manches, se terminant en pointe */}
        <path
          d="M16 3 L10.5 5 L4 8.5 L6.5 15 L10 13 L10 27 Q10 29 12 30.5 L16 34 L20 30.5 Q22 29 22 27 L22 13 L25.5 15 L28 8.5 L21.5 5 Z"
          fill={body}
          stroke={ink}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Encolure */}
        <path d="M12 4.2 L16 8 L20 4.2" fill="none" stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
        {count && count > 1 ? (
          <text
            x="16"
            y="22"
            textAnchor="middle"
            fill={ink}
            fontSize="11"
            fontWeight="800"
            fontFamily="var(--font-inter), system-ui, sans-serif"
          >
            {count}
          </text>
        ) : null}
      </g>
    </svg>
  );
}

/**
 * Marqueur « tournoi » de la même carte.
 *
 * PLACEHOLDER, comme le maillot — en attendant l'asset définitif.
 *
 * Deux écarts délibérés avec `JerseyPin`, et un seul point commun qui compte :
 * la pointe basse porte la position exacte, ici comme là.
 *
 * — La silhouette change autant que la couleur. Un coach qui distingue mal le
 *   vert de l'orange doit pouvoir lire la carte quand même : la forme est le
 *   premier signal, la couleur le second.
 * — Le dessin est PLUS HAUT que le maillot (46 contre 40). Un tournoi et une
 *   annonce partagent souvent une ville, donc le pixel près : les deux
 *   marqueurs se posent alors au même endroit, et déplacer l'un d'eux
 *   mentirait sur la direction. Le trophée dépasse par le haut du maillot qui
 *   le recouvre — on voit qu'il y a les deux.
 */
export function TrophyPin({ count, emphasis }: { count?: number; emphasis?: boolean }) {
  const body = "var(--pin-tournament)";
  const ink = "var(--pin-stroke)";
  return (
    <svg viewBox="0 0 32 46" width={32} height={46} aria-hidden focusable="false" style={{ overflow: "visible" }}>
      {/* Ombre au sol, sous le pied du trophée */}
      <ellipse cx="16" cy="43" rx="9" ry="3" fill="var(--pin-shadow)" />

      <g style={{ filter: emphasis ? "var(--pin-emphasis)" : "var(--pin-lift)" }}>
        {/* Anses, tracées avant la coupe pour passer dessous */}
        <path
          d="M9.5 9 H6 Q3.5 9 4.5 13 Q5.5 17 9.5 18"
          fill="none"
          stroke={ink}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M22.5 9 H26 Q28.5 9 27.5 13 Q26.5 17 22.5 18"
          fill="none"
          stroke={ink}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Coupe */}
        <path
          d="M9 6 H23 V16 Q23 24 16 27 Q9 24 9 16 Z"
          fill={body}
          stroke={ink}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Tige et socle, jusqu'à la pointe qui porte la position */}
        <path d="M14 27 H18 V32 H14 Z" fill={body} stroke={ink} strokeWidth="1.2" strokeLinejoin="round" />
        <path
          d="M10 40 L12 32 H20 L22 40 Z"
          fill={body}
          stroke={ink}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {count && count > 1 ? (
          <text
            x="16"
            y="19"
            textAnchor="middle"
            fill={ink}
            fontSize="11"
            fontWeight="800"
            fontFamily="var(--font-inter), system-ui, sans-serif"
          >
            {count}
          </text>
        ) : null}
      </g>
    </svg>
  );
}

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

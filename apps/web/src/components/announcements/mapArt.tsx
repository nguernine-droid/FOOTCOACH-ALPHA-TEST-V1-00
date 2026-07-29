/**
 * Dessins de la carte des matchs proches : le fond de plan et les marqueurs.
 *
 * PLACEHOLDERS — un fond de rues stylisé et un pictogramme de maillot dessinés
 * ici, en attendant les assets définitifs (voir la liste des assets à fournir).
 * Le fond n'est volontairement pas géographique : il donne à lire « une ville
 * vue du ciel » sans jamais prétendre montrer de vraies rues — la seule
 * information exacte de cet écran reste la position relative des équipes.
 *
 * UN seul jeu de tuiles pour les deux thèmes, pas deux fichiers : chaque trait
 * lit un jeton (`--map-road`, `--map-park`…). Le thème clair en tire un plan
 * gris désaturé, le sombre un plan de nuit — et il n'y a qu'un dessin à
 * maintenir le jour où le fond définitif arrivera.
 */

/**
 * Fond de plan : trame de rues, deux axes traversants, une rivière et quelques
 * îlots. Tracé à la main plutôt que tiré au hasard — un fond de carte qui
 * change à chaque rendu se lirait comme un bug.
 */
export function StreetMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
      className={className}
    >
      {/* Îlots : à peine détachés du fond, ils donnent du grain */}
      <g fill="var(--map-block)">
        <rect x="18" y="22" width="56" height="40" rx="3" />
        <rect x="96" y="14" width="72" height="34" rx="3" />
        <rect x="192" y="30" width="48" height="52" rx="3" />
        <rect x="24" y="96" width="44" height="58" rx="3" />
        <rect x="188" y="126" width="66" height="42" rx="3" />
        <rect x="40" y="200" width="70" height="48" rx="3" />
        <rect x="164" y="212" width="52" height="56" rx="3" />
      </g>

      {/* Un parc */}
      <path d="M100 150 q30 -18 62 -4 q14 30 -10 48 q-38 10 -56 -12 z" fill="var(--map-park)" />

      {/* Rivière */}
      <path
        d="M-10 214 q60 -26 110 -6 q46 18 92 -6 q30 -16 118 -30"
        fill="none"
        stroke="var(--map-water)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Rues secondaires */}
      <g stroke="var(--map-road)" strokeWidth="1.5" strokeLinecap="square">
        <path d="M0 70 H300" />
        <path d="M0 122 H300" />
        <path d="M0 178 H300" />
        <path d="M0 254 H300" />
        <path d="M82 0 V300" />
        <path d="M148 0 V300" />
        <path d="M226 0 V300" />
        <path d="M40 0 V300" />
        <path d="M272 0 V300" />
      </g>

      {/* Axes principaux : plus larges, dont deux diagonales */}
      <g stroke="var(--map-road-major)" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M0 96 H300" />
        <path d="M182 0 V300" />
        <path d="M-10 300 L160 96 L300 40" />
        <path d="M0 12 L110 130 L214 300" />
      </g>

      {/* Rocade */}
      <circle
        cx="150"
        cy="150"
        r="118"
        fill="none"
        stroke="var(--map-road)"
        strokeWidth="2.5"
        strokeDasharray="14 9"
      />
    </svg>
  );
}

/**
 * Marqueur « maillot ».
 *
 * `seeking` (doré) distingue les équipes en recherche urgente d'adversaire —
 * un SOS après désistement — des annonces ordinaires. Le maillot est ancré par
 * sa pointe basse : c'est ce point-là qui porte la position exacte, et l'ombre
 * elliptique est posée dessous pour qu'on le lise ainsi.
 *
 * Le contour vient d'un jeton : sur un plan clair comme sur un plan de nuit,
 * c'est lui qui détache le maillot du fond.
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

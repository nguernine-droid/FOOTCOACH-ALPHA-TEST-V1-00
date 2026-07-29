/**
 * Illustration isométrique de l'état « aucun match programmé » : un mini-terrain
 * sous projecteurs, avec un carnet ouvert posé dessus.
 *
 * PLACEHOLDER — dessin vectoriel de substitution, en attendant l'illustration
 * 3D définitive (voir la liste des assets à fournir). Il en respecte déjà le
 * cahier des charges : projection isométrique (2:1), volumes adoucis façon
 * « claymorphism », gazon vert et bleu nuit, ~140 px de haut, aucun texte.
 *
 * Décoratif : le titre et le sous-texte de la carte disent déjà tout, un
 * lecteur d'écran n'a rien à gagner à l'annoncer — d'où `aria-hidden`.
 */
export function PitchPlanner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 180"
      width={260}
      height={180}
      role="presentation"
      aria-hidden
      focusable="false"
      className={className}
    >
      <defs>
        {/* Gazon : deux verts, le plus clair du côté d'où vient la lumière */}
        <linearGradient id="pp-turf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--illus-turf-light)" />
          <stop offset="100%" stopColor="var(--illus-turf-dark)" />
        </linearGradient>
        {/* Tranche du volume : la même herbe, à l'ombre */}
        <linearGradient id="pp-turf-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--illus-turf-side-light)" />
          <stop offset="100%" stopColor="var(--illus-turf-side-dark)" />
        </linearGradient>
        <linearGradient id="pp-paper" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="var(--illus-paper-light)" />
          <stop offset="100%" stopColor="var(--illus-paper-dark)" />
        </linearGradient>
        <linearGradient id="pp-mast" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--illus-frame)" />
          <stop offset="100%" stopColor="var(--illus-frame-deep)" />
        </linearGradient>
        {/* Faisceau du projecteur : franc à la source, éteint au sol */}
        <linearGradient id="pp-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--illus-light)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--illus-light)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="pp-glow">
          <stop offset="0%" stopColor="var(--illus-light)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--illus-light)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ombre portée du bloc au sol */}
      <ellipse cx="130" cy="152" rx="104" ry="22" fill="var(--illus-shadow)" opacity="0.1" />

      {/* Faisceaux, sous le terrain pour qu'ils s'y posent sans le voiler */}
      <path d="M46 46 L130 66 L86 118 L20 84 Z" fill="url(#pp-beam)" />
      <path d="M214 46 L130 66 L174 118 L240 84 Z" fill="url(#pp-beam)" />

      {/* Épaisseur du terrain — c'est elle qui donne le volume */}
      <path d="M20 96 L130 152 L240 96 L240 106 L130 162 L20 106 Z" fill="url(#pp-turf-side)" />

      {/* Plateau du terrain, losange isométrique 2:1 */}
      <path d="M130 40 L240 96 L130 152 L20 96 Z" fill="url(#pp-turf)" />

      {/* Tracés du terrain, dans la même projection */}
      <g stroke="var(--illus-line)" strokeOpacity="0.75" strokeWidth="1.6" fill="none">
        <path d="M130 52 L228 96 L130 140 L32 96 Z" />
        <path d="M32 96 L228 96" />
        <ellipse cx="130" cy="96" rx="30" ry="15" />
        {/* Surfaces de réparation, aux deux extrémités */}
        <path d="M130 52 L174 74 L130 96 L86 74 Z" />
        <path d="M130 140 L174 118 L130 96 L86 118 Z" />
      </g>
      <ellipse cx="130" cy="96" rx="3" ry="1.6" fill="var(--illus-paper-light)" fillOpacity="0.85" />

      {/* Projecteur gauche : mât, tête, halo */}
      <g>
        <path d="M42 44 L48 44 L50 100 L44 100 Z" fill="url(#pp-mast)" />
        <rect x="30" y="30" width="30" height="15" rx="6" fill="var(--illus-frame)" />
        <rect x="33" y="33" width="24" height="9" rx="4" fill="var(--illus-light)" />
        <circle cx="45" cy="38" r="22" fill="url(#pp-glow)" opacity="0.45" />
      </g>

      {/* Projecteur droit */}
      <g>
        <path d="M212 44 L218 44 L216 100 L210 100 Z" fill="url(#pp-mast)" />
        <rect x="200" y="30" width="30" height="15" rx="6" fill="var(--illus-frame)" />
        <rect x="203" y="33" width="24" height="9" rx="4" fill="var(--illus-light)" />
        <circle cx="215" cy="38" r="22" fill="url(#pp-glow)" opacity="0.45" />
      </g>

      {/* Carnet ouvert posé sur le rond central */}
      <g>
        <ellipse cx="130" cy="120" rx="46" ry="11" fill="var(--illus-shadow)" opacity="0.18" />
        {/* Page gauche puis page droite, en léger V */}
        <path d="M130 100 L86 114 L88 122 L130 108 Z" fill="url(#pp-paper)" />
        <path d="M130 100 L174 114 L172 122 L130 108 Z" fill="url(#pp-paper)" />
        <path d="M130 96 L88 110 L130 100 L172 110 Z" fill="var(--illus-paper-light)" />
        {/* Lignes du planning, une par page */}
        <g stroke="var(--illus-rule)" strokeOpacity="0.9" strokeWidth="1.4" strokeLinecap="round">
          <path d="M98 112 L120 105" />
          <path d="M102 116 L122 109" />
          <path d="M140 105 L162 112" />
          <path d="M138 109 L158 116" />
        </g>
        {/* La date retenue : une pastille dorée */}
        <circle cx="130" cy="103" r="4.5" fill="var(--accent-solid)" />
        {/* Reliure */}
        <path d="M130 96 L130 108" stroke="var(--illus-shadow)" strokeOpacity="0.25" strokeWidth="1.4" />
      </g>

      {/* Ballon posé au bord du terrain */}
      <g>
        <ellipse cx="196" cy="122" rx="9" ry="4" fill="var(--illus-shadow)" opacity="0.2" />
        <circle cx="196" cy="115" r="9" fill="var(--illus-paper-light)" />
        <path d="M196 109 L200 113 L198 118 L193 118 L191 113 Z" fill="var(--illus-structure)" />
      </g>
    </svg>
  );
}

/**
 * Fond de l'application.
 *
 * Trois plans, tous fixes : ils ne défilent pas avec le contenu, comme une
 * pelouse et des projecteurs ne bougent pas quand on parcourt les gradins.
 *   1. l'aplat de fond, posé par la feuille de style sur `html` et `body` ;
 *   2. un halo d'ambiance en haut à droite — or de projecteur la nuit,
 *      crème très pâle le jour ;
 *   3. le tracé d'un terrain vu du dessus, à peine perceptible, mais c'est ce
 *      qui empêche le fond de se lire comme un aplat mort.
 *
 * Un seul dessin pour les deux thèmes : il est tracé en `currentColor`, et
 * c'est le jeton `--text-primary` qui lui donne son encre — sombre le jour,
 * claire la nuit. Opacité et halo sont eux aussi des jetons.
 *
 * Purement décoratif : `aria-hidden`, et transparent aux clics.
 */
export function AppBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Halo. `blur` en plus du dégradé : le dégradé donne la forme, le flou
          lui retire ses derniers bords perceptibles. */}
      <div
        className="absolute -top-40 -right-32 w-[560px] h-[560px] rounded-full"
        style={{
          background: "radial-gradient(circle, var(--bg-app-halo) 0%, transparent 70%)",
          opacity: "var(--bg-app-halo-opacity)",
          filter: "blur(120px)",
        }}
      />

      {/* Tracé du terrain. `slice` : le dessin couvre toujours l'écran, quitte
          à sortir du cadre — une ligne qui s'arrête en plein vide se verrait. */}
      <svg
        className="absolute inset-0 w-full h-full text-primary"
        style={{ opacity: "var(--bg-app-texture)" }}
        viewBox="0 0 800 1400"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      >
        {/* Touches et lignes de but */}
        <rect x={60} y={80} width={680} height={1240} />
        {/* Ligne médiane et rond central */}
        <line x1={60} y1={700} x2={740} y2={700} />
        <circle cx={400} cy={700} r={110} />
        <circle cx={400} cy={700} r={7} fill="currentColor" stroke="none" />

        {/* Surface de réparation et surface de but — haut */}
        <rect x={190} y={80} width={420} height={200} />
        <rect x={295} y={80} width={210} height={80} />
        <path d="M330 280 A 110 110 0 0 0 470 280" />
        <circle cx={400} cy={210} r={6} fill="currentColor" stroke="none" />

        {/* … et bas */}
        <rect x={190} y={1120} width={420} height={200} />
        <rect x={295} y={1240} width={210} height={80} />
        <path d="M330 1120 A 110 110 0 0 1 470 1120" />
        <circle cx={400} cy={1190} r={6} fill="currentColor" stroke="none" />

        {/* Arcs de corner */}
        <path d="M60 110 A 30 30 0 0 0 90 80" />
        <path d="M710 80 A 30 30 0 0 0 740 110" />
        <path d="M60 1290 A 30 30 0 0 1 90 1320" />
        <path d="M710 1320 A 30 30 0 0 1 740 1290" />
      </svg>
    </div>
  );
}

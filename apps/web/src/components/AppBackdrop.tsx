/**
 * Fond de l'application.
 *
 * Trois plans, tous fixes : ils ne défilent pas avec le contenu.
 *   1. l'aplat de fond, posé par la feuille de style sur `html` et `body` ;
 *   2. un halo d'ambiance en haut à droite — trace de craie très pâle ;
 *   3. un SCHÉMA TACTIQUE, à peine perceptible, mais c'est ce qui empêche le
 *      fond de se lire comme un aplat mort.
 *
 * Le plan (3) ne dessine PLUS un terrain vu du dessus. Le tracé de terrain est
 * le cliché de la catégorie — toutes les applications de football l'ont, et
 * c'est l'un des signaux qui rattachaient l'ancienne direction à l'imagerie
 * fédérale. Ici, c'est ce qu'un coach dessine lui-même : des positions, des
 * courses en pointillés, une trajectoire de passe. Le sujet n'est plus le
 * stade, c'est le travail.
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

      {/* Schéma tactique. `slice` : le dessin couvre toujours l'écran, quitte à
          sortir du cadre — un trait qui s'arrête en plein vide se verrait. */}
      <svg
        className="absolute inset-0 w-full h-full text-primary"
        style={{ opacity: "var(--bg-app-texture)" }}
        viewBox="0 0 800 1400"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ————— Bloc haut : une combinaison sur le côté droit —————
            Trois joueurs, une passe (trait plein) et deux appels (pointillés).
            Les nôtres sont des cercles, l'adversaire une croix : c'est la
            convention d'un tableau, elle se lit sans légende. */}
        <circle cx={180} cy={200} r={22} />
        <circle cx={430} cy={310} r={22} />
        <circle cx={650} cy={180} r={22} />

        {/* Passe : de l'un à l'autre, trait plein, chevron d'arrivée */}
        <path d="M204 210 L406 300" />
        <path d="M382 282 L410 302 L384 318" />

        {/* Appel dans le dos, en pointillés — le joueur part avant la passe */}
        <path d="M452 296 C 530 250, 570 205, 622 188" strokeDasharray="14 16" />
        <path d="M598 168 L626 187 L602 208" />

        {/* Adversaire pris à contre-pied */}
        <path d="M540 386 L580 426 M580 386 L540 426" />

        {/* ————— Bloc médian : une sortie de balle depuis l'arrière ————— */}
        <circle cx={150} cy={640} r={22} />
        <circle cx={370} cy={720} r={22} />
        <path d="M172 652 L348 712" />
        <path d="M324 694 L352 714 L326 730" />

        {/* Course longue vers l'avant, le long du couloir */}
        <path d="M392 700 C 470 610, 500 520, 496 430" strokeDasharray="14 16" />
        <path d="M474 452 L497 424 L520 452" />

        {/* Deux plots d'entraînement */}
        <path d="M640 660 L664 706 L616 706 Z" />
        <path d="M700 780 L724 826 L676 826 Z" />

        {/* ————— Bloc bas : un pressing à deux ————— */}
        <circle cx={240} cy={1080} r={22} />
        <circle cx={470} cy={1150} r={22} />
        <path d="M560 1010 L600 1050 M600 1010 L560 1050" />

        <path d="M262 1068 C 380 1010, 470 1010, 546 1032" strokeDasharray="14 16" />
        <path d="M524 1014 L550 1033 L528 1054" />
        <path d="M486 1132 C 540 1100, 570 1076, 580 1058" strokeDasharray="14 16" />

        {/* Zone à défendre, esquissée à main levée */}
        <path
          d="M120 1230 C 260 1190, 420 1200, 540 1250 C 620 1284, 600 1330, 470 1336 C 320 1344, 160 1320, 116 1284 C 92 1264, 96 1240, 120 1230 Z"
          strokeDasharray="6 18"
        />

        {/* Ligne d'axe : le seul trait droit du dessin, il tient l'ensemble */}
        <path d="M60 900 L740 900" strokeDasharray="2 26" />
      </svg>
    </div>
  );
}

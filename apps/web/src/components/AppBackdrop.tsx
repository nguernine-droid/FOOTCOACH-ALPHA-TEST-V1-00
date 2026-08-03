/**
 * Fond de l'application.
 *
 * Trois plans, tous fixes : ils ne défilent pas avec le contenu.
 *   1. l'aplat de fond, posé par la feuille de style sur `html` et `body` ;
 *   2. un halo d'ambiance en haut à droite — une lumière de fin de journée ;
 *   3. une MAILLE DE FILET, à peine perceptible, mais c'est ce qui empêche le
 *      fond de se lire comme un aplat mort.
 *
 * Le plan (3) ne dessine PLUS un terrain vu du dessus. Le tracé de terrain est
 * le cliché de la catégorie — toutes les applications de football l'ont, et
 * c'est l'un des signaux qui rattachaient l'ancienne direction à l'imagerie
 * fédérale. Ici, c'est une matière et non un plan : la maille d'un filet de
 * but, détendue, avec ses mailles qui s'ouvrent là où la corde a travaillé.
 *
 * Dessiné à la main plutôt que par un `pattern` répété : un motif parfaitement
 * régulier se lit comme une texture d'écran de veille. Les irrégularités sont
 * le sujet.
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

      {/* Maille. `slice` : le dessin couvre toujours l'écran, quitte à sortir
          du cadre — une corde qui s'arrête en plein vide se verrait. */}
      <svg
        className="absolute inset-0 w-full h-full text-primary"
        style={{ opacity: "var(--bg-app-texture)" }}
        viewBox="0 0 800 1400"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      >
        {/* Cordes descendantes vers la droite. Elles s'écartent vers le bas :
            un filet pend, il ne quadrille pas. */}
        <path d="M-40 60 C 180 240, 420 470, 700 760" />
        <path d="M60 20 C 290 210, 530 450, 800 730" />
        <path d="M-40 260 C 170 450, 400 690, 660 990" />
        <path d="M60 220 C 280 420, 520 670, 790 970" />
        <path d="M-40 480 C 160 680, 380 930, 620 1240" />
        <path d="M70 450 C 280 650, 500 900, 760 1210" />
        <path d="M-40 720 C 150 920, 350 1170, 570 1450" />
        <path d="M80 690 C 280 890, 480 1140, 720 1440" />

        {/* Cordes descendantes vers la gauche */}
        <path d="M840 60 C 620 240, 380 470, 100 760" />
        <path d="M740 20 C 510 210, 270 450, 0 730" />
        <path d="M840 260 C 630 450, 400 690, 140 990" />
        <path d="M740 220 C 520 420, 280 670, 10 970" />
        <path d="M840 480 C 640 680, 420 930, 180 1240" />
        <path d="M730 450 C 520 650, 300 900, 40 1210" />
        <path d="M840 720 C 650 920, 450 1170, 230 1450" />
        <path d="M720 690 C 520 890, 320 1140, 80 1440" />

        {/* La barre transversale à laquelle le filet est accroché : le seul
            trait droit du dessin, il tient l'ensemble. */}
        <path d="M-40 96 L840 96" strokeWidth={4} />
      </svg>
    </div>
  );
}

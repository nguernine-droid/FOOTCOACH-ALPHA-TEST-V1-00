/**
 * Fond de l'application.
 *
 * Trois plans, tous fixes : ils ne défilent pas avec le contenu.
 *   1. l'aplat de fond, posé par la feuille de style sur `html` et `body` ;
 *   2. un halo d'ambiance GRIS en haut à droite — dans cette direction, la
 *      couleur ne fait pas d'ambiance, elle désigne ;
 *   3. une GRILLE DE REPÈRES, à peine perceptible, mais c'est ce qui empêche
 *      le fond de se lire comme un aplat mort.
 *
 * Le plan (3) ne dessine PLUS un terrain vu du dessus. Le tracé de terrain est
 * le cliché de la catégorie — toutes les applications de football l'ont, et
 * c'est l'un des signaux qui rattachaient l'ancienne direction à l'imagerie
 * fédérale. Ici, c'est la grille sur laquelle l'interface est construite,
 * rendue visible : des repères, des graduations, quelques croix d'alignement.
 * Le fond ne raconte rien, il mesure.
 *
 * Régulière, contrairement aux deux autres directions : ici l'irrégularité
 * serait un mensonge. Un système qui prétend à la rigueur ne peut pas poser un
 * fond fait main.
 *
 * Un seul dessin pour les deux thèmes : il est tracé en `currentColor`, et
 * c'est le jeton `--text-primary` qui lui donne son encre — sombre le jour,
 * claire la nuit. Opacité et halo sont eux aussi des jetons.
 *
 * Purement décoratif : `aria-hidden`, et transparent aux clics.
 */

/** Pas de la grille, en unités du viewBox */
const STEP = 100;
const COLUMNS = Array.from({ length: 9 }, (_, i) => i * STEP);
const ROWS = Array.from({ length: 15 }, (_, i) => i * STEP);

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

      {/* Grille. `slice` : le dessin couvre toujours l'écran, quitte à sortir
          du cadre — une graduation qui s'arrête en plein vide se verrait. */}
      <svg
        className="absolute inset-0 w-full h-full text-primary"
        style={{ opacity: "var(--bg-app-texture)" }}
        viewBox="0 0 800 1400"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
      >
        {/* Le maillage. Un trait fin, une seule valeur : c'est le seul motif
            de fond des trois directions qui n'a pas le droit de varier. */}
        {COLUMNS.map((x) => (
          <line key={`c${x}`} x1={x} y1={0} x2={x} y2={1400} />
        ))}
        {ROWS.map((y) => (
          <line key={`r${y}`} x1={0} y1={y} x2={800} y2={y} />
        ))}

        {/* Croix d'alignement à chaque quatrième intersection. Elles donnent
            à la grille une lecture — sans elles, ce n'est qu'un quadrillage. */}
        {ROWS.filter((_, i) => i % 4 === 2).map((y) =>
          COLUMNS.filter((_, i) => i % 4 === 2).map((x) => (
            <path
              key={`x${x}-${y}`}
              d={`M${x - 10} ${y}H${x + 10}M${x} ${y - 10}V${y + 10}`}
              strokeWidth={2}
            />
          )),
        )}

        {/* Deux axes appuyés : ils tiennent la composition et donnent une
            origine à la grille. */}
        <line x1={200} y1={0} x2={200} y2={1400} strokeWidth={2.5} />
        <line x1={0} y1={600} x2={800} y2={600} strokeWidth={2.5} />

        {/* Graduation le long de l'axe vertical, tous les 25 : la mesure fine
            de l'instrument. */}
        {Array.from({ length: 56 }, (_, i) => i * 25).map((y) => (
          <line key={`g${y}`} x1={200} y1={y} x2={y % 100 === 0 ? 216 : 208} y2={y} strokeWidth={1.5} />
        ))}
      </svg>
    </div>
  );
}

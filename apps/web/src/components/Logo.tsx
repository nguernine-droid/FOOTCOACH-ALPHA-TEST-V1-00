import { cn } from "@/lib/utils";

/**
 * Marque FootCoach.
 *
 * Dessinée ici, en SVG et en jetons, plutôt que servie comme image. Trois
 * raisons : elle suit le thème sans qu'on ait à maintenir deux fichiers, elle
 * reste nette à toutes les tailles, et elle ne coûte pas une requête.
 *
 * Le motif n'est pas un blason. L'écusson est le code du club affilié, et
 * c'était l'un des signaux qui rattachaient l'ancienne direction à l'imagerie
 * fédérale. Ici, c'est un geste de tableau : un joueur, et sa course. Le même
 * vocabulaire que le fond de l'application.
 *
 * La tuile est en chaux et le geste en ardoise — jamais l'inverse : la marque
 * est presque toujours posée SUR une structure sombre (l'en-tête, le bandeau
 * de connexion), où une tuile sombre disparaîtrait.
 *
 * `aria-hidden` : le logo jouxte toujours le mot-repère « FOOTCOACH », un
 * lecteur d'écran annoncerait deux fois la même chose.
 */
export function Logo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      focusable="false"
    >
      {/* La tuile. Rayon à 25 % du côté : la même famille de courbes que les
          cartes et les boutons de l'application. */}
      <rect width="32" height="32" rx="8" fill="var(--accent-solid)" />

      {/* Le joueur — un point plein, comme sur une ardoise */}
      <circle cx="10.5" cy="21.5" r="3.1" fill="var(--accent-on)" />

      {/* Sa course, et la pointe qui dit où il va. Tracé à part du point : une
          course se dessine après le joueur, jamais d'un seul trait. */}
      <path
        d="M13.9 19.6C17 15.6 19.4 12.9 22.6 11"
        stroke="var(--accent-on)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M19.4 10.9L23.1 10.2L23 13.9"
        stroke="var(--accent-on)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

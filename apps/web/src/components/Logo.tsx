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
 * fédérale. Ici, c'est la couture d'un vieux ballon de cuir — le seul objet
 * que coachs et parents ont en commun avant d'avoir un club.
 *
 * La tuile est en terre cuite et la couture en crème — jamais l'inverse : la
 * marque est presque toujours posée SUR une structure sombre (l'en-tête, le
 * bandeau de connexion), où une tuile sombre disparaîtrait.
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

      {/* Le ballon. Sans ce cercle, la couture seule se lisait comme un
          gribouillis — c'est lui qui donne son sujet au dessin. */}
      <circle cx="16" cy="16" r="9.2" stroke="var(--illus-line)" strokeWidth="2.2" />

      {/* La couture, en S : c'est elle qui fait lire le cuir plutôt que le
          ballon de synthèse. */}
      <path
        d="M9.4 12.2C13 13.8 14.8 16.4 15.2 19.4C15.5 21.8 17.4 24 20.8 24.9"
        stroke="var(--illus-line)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Deux points de couture. Deux seulement : au-delà, à 34 px, ils se
          referment en une bouillie de traits. */}
      <path
        d="M12.9 15.4L15.1 13.9M15.6 20.5L18 19.6"
        stroke="var(--illus-line)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

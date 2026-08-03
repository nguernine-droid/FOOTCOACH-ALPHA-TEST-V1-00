import type { MetadataRoute } from "next";

/**
 * Manifeste PWA : permet « Ajouter à l'écran d'accueil » et l'ouverture en
 * plein écran, sans barre d'adresse.
 *
 * COULEURS EN DUR, ET C'EST INÉVITABLE : un manifeste est du JSON lu par le
 * système d'exploitation avant que la page n'existe — il ne peut ni lire une
 * variable CSS, ni porter deux valeurs selon le thème.
 *
 * D'où le choix de l'ardoise structurelle plutôt que du fond d'application :
 * c'est la seule matière que les deux thèmes ont en commun (elle porte
 * l'en-tête dans les deux), donc la seule qui ne produise pas un écran de
 * démarrage blanc pour un coach en thème sombre. Ces valeurs doivent rester
 * alignées sur `--structure-1` de `tokens.css`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FootCoach — matchs amicaux",
    short_name: "FootCoach",
    description: "Trouvez un adversaire, organisez le match amical et validez le score entre coachs.",
    lang: "fr",
    // "/" redirige déjà vers l'espace du rôle connecté (ou /login)
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#16181C",
    theme_color: "#16181C",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Fond blanc et marque à 72 % : le masque circulaire ou en squircle du
      // système ne rogne jamais le logo.
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

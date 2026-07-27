import type { MetadataRoute } from "next";

/**
 * Manifeste PWA : permet « Ajouter à l'écran d'accueil » et l'ouverture en
 * plein écran, sans barre d'adresse. Les couleurs reprennent la DA navy/or.
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
    background_color: "#EDF1F8",
    theme_color: "#071B3F",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/publicApi";

/**
 * Ce qu'un robot a le droit de parcourir.
 *
 * Tout est fermé sauf `/f`, la couche publique. Les espaces coach, club et
 * admin sont derrière une authentification, mais l'interdiction explicite sert
 * quand même : elle évite qu'un robot consomme le service à frapper des pages
 * qui lui répondront toujours « connectez-vous », et elle empêche que ces URL
 * apparaissent dans un index simplement parce qu'un lien externe les cite.
 *
 * `/api` est fermé pour la même raison. `/login` et `/register`, en revanche,
 * restent ouverts : ce sont les pages qu'on attend en cherchant le nom du
 * service, et c'est vers l'inscription que mènent toutes les pages publiques —
 * l'interdire au robot qui vient de les lire n'aurait aucun sens.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/f"],
        disallow: ["/api/", "/coach/", "/club/", "/admin/", "/supporter/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

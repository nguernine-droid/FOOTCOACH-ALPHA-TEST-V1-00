import type { MetadataRoute } from "next";
import { categorySlug } from "@teamnexus/shared";
import { fetchDistricts, siteUrl } from "@/lib/publicApi";

/**
 * Le plan du site : uniquement ce qui est PUBLIC.
 *
 * L'espace coach n'y figure pas, et pas seulement parce qu'il exige un compte —
 * une URL déclarée au moteur est une URL qu'il tentera, et rien de bon ne sort
 * d'un robot qui frappe à la porte de /coach/matches trois cents fois par jour.
 *
 * Les pages listées se limitent aux départements où quelque chose se passe :
 * déclarer cent départements vides apprendrait au moteur que ce site répond mal
 * aux questions qu'on lui pose.
 */
// Toujours recalculé, jamais figé à la compilation : construit au build, ce
// fichier serait le reflet d'une base vide — celle du serveur d'intégration —
// et un moteur n'y trouverait qu'une seule URL. Un plan de site se demande
// quelques fois par jour, son coût est négligeable.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const districts = (await fetchDistricts()) ?? [];

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/f`, changeFrequency: "daily", priority: 1 },
  ];

  for (const district of districts) {
    entries.push({
      url: `${base}/f/${district.slug}`,
      changeFrequency: "daily",
      priority: 0.8,
    });
    for (const entry of district.categories) {
      entries.push({
        url: `${base}/f/${district.slug}/${categorySlug(entry.category)}`,
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  }

  return entries;
}

import type { MetadataRoute } from "next";
import { categorySlug } from "@teamnexus/shared";
import { fetchDistricts, siteUrl } from "@/lib/publicApi";
import { legalIsComplete } from "@/lib/legal";

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
    // La racine d'abord, et seule à porter la priorité maximale : c'est la page
    // qu'on veut voir remonter sur le nom du service. `/f` la suit de près — il
    // change tous les jours, elle presque jamais — mais un plan de site où deux
    // pages sont « la plus importante » n'en désigne aucune.
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/f`, changeFrequency: "daily", priority: 0.9 },
    // La page vers laquelle mène chaque bouton du site. Elle porte son propre
    // titre et sa propre description depuis qu'un layout les lui donne ; la
    // déclarer coûte une ligne et évite qu'elle ne soit découverte que par les
    // liens internes.
    { url: `${base}/register`, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Les pages légales ne sont déclarées qu'une fois RENSEIGNÉES. Tant qu'il y
  // manque une information d'identification, chacune porte déjà un `noindex`
  // dans ses métadonnées ; l'annoncer au plan du site en même temps reviendrait
  // à demander au moteur de venir voir une page qu'on lui interdit de garder.
  if (legalIsComplete()) {
    for (const path of ["/mentions-legales", "/confidentialite", "/cgu"]) {
      entries.push({ url: `${base}${path}`, changeFrequency: "yearly", priority: 0.3 });
    }
  }

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

import type {
  PublicAnnouncementDto,
  PublicBoardDto,
  PublicDistrictDto,
  PublicStatsDto,
} from "@teamnexus/shared";

/**
 * Appels de la couche publique, faits DEPUIS LE SERVEUR.
 *
 * Les pages publiques sont rendues côté serveur : elles ne passent donc pas par
 * la réécriture `/api` du navigateur, mais parlent directement au service API,
 * par le même nom interne que la réécriture — une seule adresse à connaître,
 * qu'on soit dans Docker ou sur un poste de développement.
 *
 * Aucun jeton n'est joint, et c'est le propos : ce que ces routes renvoient est
 * exactement ce qu'un visiteur sans compte a le droit de voir.
 */
const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/** Fenêtre de fraîcheur, alignée sur le `Cache-Control` que pose l'API */
export const PUBLIC_REVALIDATE_SECONDS = 300;

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: PUBLIC_REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // L'API indisponible ne doit pas rendre une erreur 500 à un moteur : la
    // page se rend vide et sera réindexée plus tard.
    return null;
  }
}

export function fetchDistricts(): Promise<PublicDistrictDto[] | null> {
  return get<PublicDistrictDto[]>("/public/board");
}

/**
 * Les prochaines annonces, toutes zones confondues. Le nombre est décidé par
 * le serveur : la page affiche ce qu'elle reçoit, elle ne le négocie pas.
 */
export function fetchLatestAnnouncements(): Promise<PublicAnnouncementDto[] | null> {
  return get<PublicAnnouncementDto[]>("/public/announcements");
}

export function fetchPublicStats(): Promise<PublicStatsDto | null> {
  return get<PublicStatsDto>("/public/stats");
}

export function fetchBoard(code: string, categorySlug?: string): Promise<PublicBoardDto | null> {
  const query = categorySlug ? `?categorie=${encodeURIComponent(categorySlug)}` : "";
  return get<PublicBoardDto>(`/public/board/${encodeURIComponent(code)}${query}`);
}

/** Adresse publique du site, pour les URL absolues du plan du site */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://teamnexus.fr").replace(/\/+$/, "");
}

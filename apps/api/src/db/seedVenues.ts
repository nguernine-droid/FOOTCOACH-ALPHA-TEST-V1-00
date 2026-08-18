import { sql } from "drizzle-orm";
import { db } from "./client.js";
import { venues } from "./schema.js";

/**
 * Import des terrains de football depuis le recensement des équipements
 * sportifs du ministère chargé des sports (licence ouverte).
 *
 * ── Pourquoi l'import va chercher les données, au lieu de les embarquer ──
 * Le référentiel des districts tient en 93 lignes relues à la main : il est
 * versionné. Celui-ci en compte 36 000, purement mécaniques, et pèse 14 Mo —
 * le versionner alourdirait chaque clone pour une donnée que personne ne relit
 * jamais. L'import est une opération d'administrateur, pas une étape de
 * déploiement : si la source est indisponible, on le relance plus tard.
 *
 * ── Rejouable ───────────────────────────────────────────────────────────
 * Chaque terrain porte son identifiant de recensement (`equip_numero`), et
 * l'insertion se fait en `onConflictDoUpdate` : relancer met à jour, ne
 * duplique pas. Rien n'est supprimé — un terrain retiré du recensement peut
 * encore être celui où une équipe joue.
 *
 * Usage : npm run db:venues --workspace apps/api
 */

const SOURCE =
  "https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/data-es/exports/json";

const FIELDS = [
  "equip_numero",
  "inst_nom",
  "equip_nom",
  "inst_adresse",
  "inst_cp",
  "new_name",
  "dep_code",
  "equip_coordonnees",
  "equip_sol",
  "equip_eclair",
  "equip_vest_sport",
].join(",");

interface SourceRow {
  equip_numero: string;
  inst_nom: string | null;
  equip_nom: string | null;
  inst_adresse: string | null;
  inst_cp: string | null;
  new_name: string | null;
  dep_code: string | null;
  equip_coordonnees: { lat: number; lon: number } | null;
  equip_sol: string | null;
  equip_eclair: string | null;
  equip_vest_sport: number | null;
}

const SMALL = new Set(["de", "du", "des", "la", "le", "les", "et", "en", "au", "aux", "sur", "sous"]);

/**
 * Le recensement écrit un nom sur trois tout en capitales : « STADE MUNICIPAL »
 * à côté de « Stade municipal des marais ». Les afficher tels quels donnerait
 * une liste qui crie une ligne sur trois.
 *
 * Seuls les noms SANS AUCUNE minuscule sont retouchés : un nom déjà écrit
 * normalement est laissé intact, y compris ses sigles.
 */
function tidyName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (/[a-zà-ÿ]/.test(name)) return name;
  return name
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL.has(word)
        ? word
        : word.replace(/(^|['’-])([a-zà-ÿ])/g, (_m, sep, c) => sep + c.toUpperCase()),
    )
    .join(" ");
}

/** Minuscules sans accents — la forme sur laquelle porte la recherche */
function searchable(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Le recensement écrit les booléens en texte (« true », « false ») et laisse
 * parfois la case vide. On ne devine pas : sans valeur, la colonne reste NULL,
 * et l'interface dira « non renseigné » plutôt que « pas d'éclairage ».
 */
function toBool(value: string | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export async function importVenues(log: (message: string) => void = console.log): Promise<void> {
  const url = `${SOURCE}?where=${encodeURIComponent('equip_type_name="Terrain de football"')}&select=${FIELDS}`;
  log("Téléchargement du recensement…");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Le recensement a répondu ${res.status}`);
  const rows = (await res.json()) as SourceRow[];
  log(`${rows.length} terrains reçus.`);

  // Le recensement contient quelques doublons d'identifiant : le dernier gagne,
  // comme le ferait l'insertion, mais autant ne pas écrire deux fois.
  const bySource = new Map<string, SourceRow>();
  for (const row of rows) if (row.equip_numero) bySource.set(row.equip_numero, row);

  const values = [];
  let skipped = 0;
  for (const row of bySource.values()) {
    const coords = row.equip_coordonnees;
    const name = tidyName(row.inst_nom ?? "");
    // Sans coordonnées ni nom, la ligne ne sert ni à choisir ni à situer
    if (!coords || coords.lat == null || coords.lon == null || !name || !row.new_name) {
      skipped++;
      continue;
    }
    values.push({
      sourceId: row.equip_numero,
      name,
      pitchName: row.equip_nom?.trim() || null,
      searchName: searchable(`${name} ${row.new_name}`),
      address: row.inst_adresse?.trim() || null,
      postalCode: row.inst_cp?.trim() || null,
      city: row.new_name.trim(),
      department: row.dep_code ?? null,
      lat: coords.lat,
      lng: coords.lon,
      surface: row.equip_sol?.trim() || null,
      floodlit: toBool(row.equip_eclair),
      changingRooms: row.equip_vest_sport ?? null,
    });
  }

  // Par paquets : 36 000 lignes en une requête dépassent le nombre de
  // paramètres qu'un serveur PostgreSQL accepte.
  const BATCH = 500;
  for (let i = 0; i < values.length; i += BATCH) {
    await db
      .insert(venues)
      .values(values.slice(i, i + BATCH))
      .onConflictDoUpdate({
        target: venues.sourceId,
        set: {
          name: sql`excluded.name`,
          pitchName: sql`excluded.pitch_name`,
          searchName: sql`excluded.search_name`,
          address: sql`excluded.address`,
          postalCode: sql`excluded.postal_code`,
          city: sql`excluded.city`,
          department: sql`excluded.department`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          surface: sql`excluded.surface`,
          floodlit: sql`excluded.floodlit`,
          changingRooms: sql`excluded.changing_rooms`,
          updatedAt: new Date(),
        },
      });
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(venues);
  log(`${values.length} terrains importés${skipped > 0 ? `, ${skipped} écartés (sans nom ou sans position)` : ""}.`);
  log(`Total en base : ${count}.`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seedVenues.ts")) {
  importVenues()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

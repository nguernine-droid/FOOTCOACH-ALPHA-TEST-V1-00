import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { districts } from "./schema.js";

/**
 * Import du référentiel des districts.
 *
 * ── Pourquoi celui-ci peut tourner en production ────────────────────────
 * `seed.ts` est refusé hors poste local (voir `seedGuard.ts`) : il crée des
 * comptes de démonstration aux identifiants publiés. Celui-ci n'a rien de
 * commun avec lui — il n'écrit qu'un référentiel géographique, sans compte,
 * sans secret, et il est REJOUABLE : la remise à jour retrouve chaque ligne par
 * son `slug` et n'en duplique aucune.
 *
 * ── Ce qu'il ne touche jamais ───────────────────────────────────────────
 * Le drapeau `verified` et le nom relu par un administrateur. Quelqu'un a passé
 * du temps à corriger « District de la Côte d'Azur » ; un import qui repasserait
 * dessus effacerait ce travail à chaque déploiement. Seules les colonnes issues
 * du registre (nom légal, SIREN, commune) sont rafraîchies, et uniquement pour
 * les lignes que personne n'a encore validées.
 *
 * Usage : npm run db:districts --workspace apps/api
 */

interface ReferenceRow {
  name: string;
  legalName: string | null;
  siren: string | null;
  city: string | null;
  departments: string[];
  source: "annuaire" | "manuel";
  slug: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadReference(): ReferenceRow[] {
  const file = path.join(__dirname, "..", "lib", "districtsReference.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf-8")) as ReferenceRow[];

  // Un référentiel incohérent doit s'arrêter ici, pas se découvrir en base
  const slugs = new Set<string>();
  for (const row of rows) {
    if (!row.slug || !row.name) throw new Error(`Ligne sans slug ou sans nom : ${JSON.stringify(row)}`);
    if (row.departments.length === 0) throw new Error(`${row.name} ne couvre aucun département`);
    if (slugs.has(row.slug)) throw new Error(`Slug en double : ${row.slug}`);
    slugs.add(row.slug);
  }
  return rows;
}

export async function importDistricts(log: (message: string) => void = console.log): Promise<void> {
  const reference = loadReference();
  const existing = await db.select().from(districts);
  const bySlug = new Map(existing.map((d) => [d.slug, d]));

  let created = 0;
  let updated = 0;
  let untouched = 0;

  for (const row of reference) {
    const current = bySlug.get(row.slug);
    if (!current) {
      await db.insert(districts).values({
        name: row.name,
        slug: row.slug,
        legalName: row.legalName,
        siren: row.siren,
        city: row.city,
        departments: row.departments,
        source: row.source,
        // Ce qui vient du registre est déjà adossé à une source vérifiable ;
        // ce qui a été saisi à la main attend une relecture.
        verified: row.source === "annuaire",
      });
      created++;
      continue;
    }

    // Une ligne relue par un administrateur ne se réécrit pas
    if (current.verified && current.source === "manuel") {
      untouched++;
      continue;
    }

    const changed =
      current.legalName !== row.legalName ||
      current.siren !== row.siren ||
      current.city !== row.city ||
      current.departments.join(",") !== row.departments.join(",");
    if (!changed) {
      untouched++;
      continue;
    }

    await db
      .update(districts)
      .set({
        legalName: row.legalName,
        siren: row.siren,
        city: row.city,
        departments: row.departments,
      })
      .where(eq(districts.id, current.id));
    updated++;
  }

  // Ce que le référentiel ne contient plus : signalé, jamais supprimé. Un
  // district retiré du fichier par erreur emporterait avec lui le rattachement
  // des équipes ; c'est une décision d'administrateur, pas d'un script.
  const known = new Set(reference.map((r) => r.slug));
  const orphans = existing.filter((d) => !known.has(d.slug));

  log(`Districts : ${created} créés, ${updated} mis à jour, ${untouched} inchangés.`);
  if (orphans.length > 0) {
    log(`⚠ ${orphans.length} district(s) en base absents du référentiel — non supprimés :`);
    for (const orphan of orphans) log(`   ${orphan.name} (${orphan.slug})`);
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(districts);
  const [{ toVerify }] = await db
    .select({ toVerify: sql<number>`count(*) filter (where not verified)::int` })
    .from(districts);
  log(`Total en base : ${count}, dont ${toVerify} à vérifier.`);
}

// Exécuté directement : `tsx src/db/seedDistricts.ts`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seedDistricts.ts")) {
  importDistricts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

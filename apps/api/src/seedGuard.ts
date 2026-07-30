/**
 * Garde-fous du jeu de données de démonstration.
 *
 * `seed.ts` crée des comptes dont les identifiants sont publiés dans le README,
 * dont un administrateur — et `upsertUser` emploie `onConflictDoUpdate`, si bien
 * que rejouer le seed RÉÉCRIT les comptes portant ces adresses. Le script ne
 * consultait ni NODE_ENV ni la cible de DATABASE_URL : l'opérateur qui suivait
 * les instructions de démarrage sur la pile de production s'y créait un
 * administrateur au mot de passe connu de tous.
 *
 * Sorti dans son propre module pour être exerçable par un test sans toucher à
 * une base.
 */

/** Hôtes considérés comme un poste de développement ou la pile compose locale. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres", "db"]);

export class SeedRefused extends Error {}

export function hostOfDatabaseUrl(databaseUrl: string): string | null {
  try {
    return new URL(databaseUrl).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Lève `SeedRefused` si le seed ne doit pas s'exécuter dans ce contexte.
 *
 * Deux barrières, parce qu'aucune ne suffit seule :
 *   - NODE_ENV=production ferme le cas de la pile de production ;
 *   - un hôte de base non local ferme le cas du DATABASE_URL pointé à la main
 *     depuis un poste de développement, où NODE_ENV ne dit rien d'utile.
 *
 * La seconde barrière se lève avec FOOTCOACH_SEED_CONFIRM=oui : peupler une base
 * de recette distante est un usage légitime, il doit juste être délibéré.
 */
export function assertSeedAllowed(context: {
  nodeEnv: string | undefined;
  databaseUrl: string | undefined;
  confirm: string | undefined;
}): void {
  if (context.nodeEnv === "production") {
    throw new SeedRefused(
      "Seed refusé : NODE_ENV=production. Ce jeu de données crée des comptes de " +
        "démonstration dont les identifiants sont publiés dans le README, administrateur compris.",
    );
  }

  const host = hostOfDatabaseUrl(context.databaseUrl ?? "");
  if (host === null) {
    throw new SeedRefused("Seed refusé : DATABASE_URL absent ou illisible.");
  }

  if (!LOCAL_HOSTS.has(host) && context.confirm !== "oui") {
    throw new SeedRefused(
      `Seed refusé : la base visée (${host}) n'est pas locale. Ce jeu de données crée des ` +
        "comptes aux identifiants publiés et RÉÉCRIT les comptes existants qui portent les " +
        "mêmes adresses. Pour l'exécuter délibérément : FOOTCOACH_SEED_CONFIRM=oui",
    );
  }
}

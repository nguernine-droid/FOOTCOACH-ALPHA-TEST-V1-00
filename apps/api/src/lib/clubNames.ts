/**
 * Mise en forme des noms de clubs venus de l'annuaire des entreprises.
 *
 * Module à part et sans dépendance : `clubDirectory.ts` importe la
 * configuration, donc la base de données et les secrets, ce qui rendait ces
 * fonctions intestables hors d'un environnement complet. Elles ne font que
 * transformer du texte, elles n'ont besoin de rien.
 */

/**
 * Mots qui restent en minuscules au milieu d'un nom — « Couzon-au-Mont-d'Or »
 * et non « Couzon-Au-Mont-D'Or ». Jamais en tête : « Le Puy » garde sa
 * majuscule.
 */
const PARTICLES = new Set([
  "de", "du", "des", "d", "la", "le", "les", "l", "et", "en", "sur", "sous", "au", "aux", "a", "lès",
]);

/** Sigles de clubs qu'on veut voir en capitales plutôt que capitalisés */
const ACRONYMS = /\b(fc|as|us|ac|sc|cs|es|ol|asc|usc|ca|rc|ujs|cos|ass)\b/gi;

/**
 * Mots qui trahissent un club de football. Ils ne FILTRENT pas — beaucoup de
 * clubs s'appellent « AS Machin » sans que rien ne le dise — ils remontent les
 * résultats les plus probables. Écarter les autres cacherait des clubs
 * légitimes, ce qui est pire qu'un club de judo dans la liste : le coach
 * reconnaît le sien, il ne devine pas celui qui manque.
 */
const FOOTBALL_HINTS = [
  "FOOT",
  " FC",
  "FC ",
  " AS",
  "AS ",
  " US",
  "US ",
  "OLYMPIQUE",
  "SPORTING",
  "ENTENTE",
  "ESPERANCE",
  "RACING",
  "STADE",
];

/**
 * Un nom d'entreprise arrive en capitales et sans accents
 * (« OLYMPIQUE LYON SUD »). Remis en casse normale, il ressemble à ce qu'un
 * coach écrirait — mais les sigles courts restent intacts (« FC » ne doit pas
 * devenir « Fc ») et les particules restent basses.
 *
 * Les accents manquants ne sont PAS devinés : « Comite » resterait « Comité »
 * pour l'un et « Comite » pour l'autre, et une suggestion n'est qu'un point de
 * départ — le coach corrige en deux touches.
 */
export function prettifyClubName(raw: string): string {
  let first = true;
  const capitalized = raw
    .toLowerCase()
    .split(" ")
    .map((word) =>
      // Chaque partie d'un mot composé est traitée à part : saint-genis-laval
      // → Saint-Genis-Laval, l'ecole → L'Ecole.
      word
        .split(/([-'])/)
        .map((part) => {
          if (part === "-" || part === "'" || part.length === 0) return part;
          const keepLow = !first && PARTICLES.has(part);
          first = false;
          return keepLow ? part : part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(""),
    )
    .join(" ");
  return capitalized.replace(ACRONYMS, (m) => m.toUpperCase());
}

/** Le sigle est accolé au nom complet entre parenthèses : « … (OLS) » */
export function stripSigle(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/** 1 si le nom ressemble à un club de football, 0 sinon — sert au tri */
export function footballScore(name: string): number {
  const upper = ` ${name.toUpperCase()} `;
  return FOOTBALL_HINTS.some((hint) => upper.includes(hint)) ? 1 : 0;
}

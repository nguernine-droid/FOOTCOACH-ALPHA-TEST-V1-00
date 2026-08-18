/**
 * Les noms de commune abrégés, et la clé d'annuaire qui leur correspond.
 *
 * ── Pourquoi ce fichier existe ──────────────────────────────────────────
 * `communesCoords.json` et `communeDepartments.json` sont jumeaux : même
 * source, mêmes clés, mêmes 32 677 communes. L'un donne un point sur la carte,
 * l'autre un département. Leur invariant est écrit noir sur blanc en tête de
 * `districts.ts` : une ville qui a des coordonnées a un département, faute de
 * quoi on obtient « un point sur le radar qu'aucun tableau ne saurait
 * compter ».
 *
 * Les alias l'ont cassé. Ils vivaient dans `cities.ts` sous la forme
 * « nom abrégé → coordonnées » : ajouter « Valras » y donnait un point au
 * radar, mais laissait la commune SANS département — donc absente des pages
 * publiques par zone, et absente des chiffres. Exactement la situation que le
 * commentaire annonçait.
 *
 * D'où cette table, qui ne porte plus de coordonnées mais un RENVOI vers le
 * nom officiel. Les deux annuaires la traversent, ils ne peuvent donc plus
 * connaître des communes différentes. Ajouter un alias ici le fait exister des
 * deux côtés à la fois, ou d'aucun.
 *
 * ── Ce qu'on y met ──────────────────────────────────────────────────────
 * Les formes qu'un coach tape réellement, et qui ne sont pas le nom officiel :
 * « Valras » pour Valras-Plage, « Caluire » pour Caluire-et-Cuire. Rien qui
 * relève de la faute de frappe — un annuaire n'est pas un correcteur.
 */

/** Normalisation commune aux deux annuaires : sans casse, sans accent, espaces resserrés */
export function normalizeCity(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/** Alias normalisé → clé officielle, telle qu'elle figure dans les deux annuaires */
const CITY_ALIASES: Record<string, string> = {
  caluire: "caluire-et-cuire",
  decines: "decines-charpieu",
  valras: "valras-plage",
};

/**
 * La clé d'annuaire d'un nom de commune : la sienne, ou celle vers laquelle
 * son alias renvoie. C'est le seul point d'entrée des deux annuaires.
 */
export function communeKey(name: string): string {
  const key = normalizeCity(name);
  return CITY_ALIASES[key] ?? key;
}

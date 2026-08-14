/**
 * Rapprochement de deux noms de clubs — la question « n'est-ce pas déjà ce
 * club ? » posée avant d'en déclarer un second.
 *
 * Module sans dépendance, comme `clubNames.ts` et pour la même raison : ces
 * fonctions ne transforment que du texte, elles doivent pouvoir se tester sans
 * base ni configuration.
 */

/**
 * La forme comparable d'un nom : sans accents, sans casse, sans ponctuation.
 * « A.S. Saint-Étienne » et « as saint etienne » se ramènent au même texte —
 * c'est exactement ce qui distingue deux saisies du même club de deux clubs
 * différents.
 */
export function clubKey(value: string): string {
  return value
    .normalize("NFD")
    // Marques diacritiques laissées par la décomposition NFD
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Ces deux noms désignent-ils probablement le même club ?
 *
 * Volontairement large — inclusion dans les deux sens : « AS Lyon » doit
 * retrouver « AS Lyon Football » comme l'inverse. Ce n'est pas un verdict mais
 * une question posée au coach, qui garde le dernier mot ; une question de trop
 * coûte un tap, un doublon manqué coûte deux clubs qui ne se retrouveront
 * jamais.
 *
 * La ville, elle, doit être IDENTIQUE (voir `sameCity`) : c'est elle qui empêche
 * de rattacher un coach au club homonyme d'une autre région.
 */
export function clubNamesLookAlike(a: string, b: string): boolean {
  const left = compactKey(a);
  const right = compactKey(b);
  // Une saisie d'une lettre rapprocherait tout de tout.
  if (left.length < 2 || right.length < 2) return false;
  return left === right || left.includes(right) || right.includes(left);
}

/**
 * La forme comparable, espaces compris : « A.S. Saint-Étienne » et
 * « AS Saint-Etienne » ne se distinguent que par un point, qui laisse un « a »
 * isolé d'un côté. Comparer sans les espaces règle ce cas très fréquent (les
 * sigles s'écrivent avec ou sans points selon les gens) sans rapprocher pour
 * autant deux clubs dont les lettres diffèrent.
 */
function compactKey(value: string): string {
  return clubKey(value).replace(/ /g, "");
}

/** Le même club, à l'écriture près — la question ne se pose même pas */
export function clubNamesEqual(a: string, b: string): boolean {
  return compactKey(a).length > 0 && compactKey(a) === compactKey(b);
}

/** Même commune, aux accents et à la casse près */
export function sameCity(a: string, b: string): boolean {
  const left = clubKey(a);
  return left.length > 0 && left === clubKey(b);
}

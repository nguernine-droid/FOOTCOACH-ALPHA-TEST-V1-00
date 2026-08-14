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

/**
 * Les clubs qui n'en sont probablement qu'un, rassemblés en groupes — la vue
 * qu'un administrateur ouvre pour rattraper deux écritures du même nom.
 *
 * Regroupement par transitivité : si A ressemble à B et B à C, les trois sont
 * dans le même groupe, même si A et C ne se ressemblent pas directement
 * (« AS Lyon », « AS Lyon Football », « Lyon Football »). C'est l'admin qui
 * tranche ensuite, et il vaut mieux lui présenter les trois d'un coup que deux
 * groupes qui se recoupent.
 *
 * Les clubs seuls de leur espèce sont écartés : un groupe d'un club n'est pas
 * un doublon. Comparaison en O(n²), à l'image de `findSimilarClubs` — la table
 * se compte en centaines.
 */
export function groupLookAlikeClubs<T extends { name: string; city: string }>(clubs: T[]): T[][] {
  // Union-find sans structure dédiée : chaque club porte l'indice de son groupe,
  // et une fusion réétiquette les membres du groupe absorbé.
  const groupOf = clubs.map((_, i) => i);
  for (let i = 0; i < clubs.length; i++) {
    for (let j = i + 1; j < clubs.length; j++) {
      if (groupOf[i] === groupOf[j]) continue;
      if (!sameCity(clubs[i].city, clubs[j].city)) continue;
      if (!clubNamesLookAlike(clubs[i].name, clubs[j].name)) continue;
      const absorbed = groupOf[j];
      const kept = groupOf[i];
      for (let k = 0; k < groupOf.length; k++) if (groupOf[k] === absorbed) groupOf[k] = kept;
    }
  }

  const groups = new Map<number, T[]>();
  clubs.forEach((club, i) => {
    const bucket = groups.get(groupOf[i]);
    if (bucket) bucket.push(club);
    else groups.set(groupOf[i], [club]);
  });
  return Array.from(groups.values()).filter((group) => group.length > 1);
}

/** Même commune, aux accents et à la casse près */
export function sameCity(a: string, b: string): boolean {
  const left = clubKey(a);
  return left.length > 0 && left === clubKey(b);
}

import { timingSafeEqual } from "node:crypto";

/**
 * Compare deux jetons sans laisser leur durée de comparaison renseigner sur le
 * nombre d'octets corrects.
 *
 * `a !== b` sur des chaînes s'arrête au premier octet qui diffère : plus le
 * préfixe fourni est juste, plus la comparaison est longue. Sur un jeton deviné
 * octet par octet, c'est ce qui permet de le reconstruire sans jamais le
 * connaître.
 *
 * `timingSafeEqual` exige des longueurs égales — la comparaison de longueur est
 * elle-même divulgatrice, mais la longueur d'un jeton n'est pas un secret : elle
 * est fixée par le code qui l'émet.
 */
export function tokensMatch(given: string, expected: string | null): boolean {
  if (expected === null) return false;
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

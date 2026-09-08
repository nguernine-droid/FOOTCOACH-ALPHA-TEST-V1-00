import crypto from "node:crypto";
import { PASSWORD_MIN_LENGTH } from "@footcoach/shared";

/**
 * Alphabet sans caractères ambigus : ces mots de passe se transmettent de vive
 * voix ou par SMS, un « l » pris pour un « 1 » coûte un appel de plus.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/**
 * Mot de passe temporaire lisible, généré par l'administrateur ou le club.
 *
 * Aligné sur `PASSWORD_MIN_LENGTH` : il n'aurait pas de sens de distribuer des
 * mots de passe plus courts que ce que l'application exige de ses utilisateurs.
 * 12 caractères sur cet alphabet de 54 valent environ 69 bits — largement au-delà
 * de ce qu'un usage à courte durée demande.
 *
 * Le tirage écarte le biais du modulo : 256 n'étant pas un multiple de 54, un
 * `% 54` favoriserait les premières lettres de l'alphabet. Le biais serait ici
 * sans conséquence pratique, mais un générateur de mots de passe est le dernier
 * endroit où laisser traîner un « sans conséquence ».
 */
export function generateTempPassword(length = PASSWORD_MIN_LENGTH): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  const out: string[] = [];
  while (out.length < length) {
    for (const byte of crypto.randomBytes(length)) {
      if (byte >= limit) continue; // valeur qui déséquilibrerait le tirage
      out.push(ALPHABET[byte % ALPHABET.length]);
      if (out.length === length) break;
    }
  }
  return out.join("");
}

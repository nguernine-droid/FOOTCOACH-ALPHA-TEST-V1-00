import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * `promisify` perd la surcharge de `scrypt` qui accepte des options : elle n'en
 * expose que la forme à trois arguments, et les paramètres de coût deviennent
 * intransmissibles. D'où cette enveloppe explicite.
 */
function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, derived) =>
      err ? reject(err) : resolve(derived),
    );
  });
}

/**
 * Hachage des mots de passe : scrypt natif, avec lecture des empreintes bcrypt
 * existantes.
 *
 * ── Pourquoi changer ─────────────────────────────────────────────────────
 * L'application hachait en bcrypt coût 10 via `bcryptjs`, une implémentation en
 * JavaScript pur. Le coût 10 était la recommandation d'il y a dix ans ; et
 * bcrypt ne résiste pas au matériel spécialisé comme le fait une fonction
 * mémoire-dure. scrypt est dans `node:crypto` — natif, aucune dépendance.
 *
 * ── Aucune migration ─────────────────────────────────────────────────────
 * Rien n'est réécrit en masse et personne n'est verrouillé dehors. La
 * vérification reconnaît les deux formats à leur préfixe, et une empreinte
 * bcrypt est réencodée en scrypt à la première connexion réussie — moment où
 * l'on détient le mot de passe en clair, et le seul où c'est possible.
 * La colonne reste un `text`, le schéma ne change pas.
 *
 * ── Le choix des paramètres ──────────────────────────────────────────────
 * N=32768, r=8, p=1 n'est pas un réglage par défaut : il est mesuré. Sur le
 * matériel de développement, une vérification scrypt y prend 62,9 ms contre
 * 62,4 ms pour bcryptjs coût 10. Cette égalité importe — la route de connexion
 * compare TOUJOURS, même pour un compte inconnu, précisément pour que la durée
 * de réponse ne révèle pas quels emails sont inscrits. Des paramètres plus
 * lents que l'héritage bcrypt auraient rouvert cette fuite par la bande, en
 * distinguant « compte inconnu » de « compte au format ancien ».
 *
 * Coût mémoire : 128 × N × r = 32 Mo par vérification. Le parallélisme est borné
 * par le pool de fils de libuv (4 par défaut), soit 128 Mo au pic, et le débit
 * de la connexion est de toute façon plafonné en amont.
 */

const SCRYPT_PARAMS = { N: 32_768, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** Il faut autoriser plus que les 32 Mo requis : le défaut de Node les refuse. */
const MAX_MEMORY = 64 * 1024 * 1024;
const PREFIX = "scrypt";

/** Empreinte au format `scrypt$N$r$p$sel$clé`, tout en base64url. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(plain, salt, KEY_LENGTH, { ...SCRYPT_PARAMS, maxmem: MAX_MEMORY });
  const { N, r, p } = SCRYPT_PARAMS;
  return [PREFIX, N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/** Une empreinte bcrypt, telle que produite avant ce changement. */
function isBcrypt(stored: string): boolean {
  return stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
}

/** L'empreinte gagnerait-elle à être réécrite ? (format hérité) */
export function needsRehash(stored: string): boolean {
  return isBcrypt(stored);
}

async function verifyScrypt(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  // scrypt $ N $ r $ p $ sel $ clé
  if (parts.length !== 6) return false;
  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  // Une empreinte est une donnée de notre base, pas une entrée d'utilisateur ;
  // mais des paramètres absurdes y feraient allouer une mémoire déraisonnable.
  if (N < 1024 || N > 1_048_576 || r < 1 || r > 32 || p < 1 || p > 16) return false;

  const salt = Buffer.from(rawSalt, "base64url");
  const expected = Buffer.from(rawKey, "base64url");
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = await scrypt(plain, salt, expected.length, { N, r, p, maxmem: MAX_MEMORY });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Le mot de passe correspond-il à l'empreinte stockée ? Reconnaît scrypt et
 * bcrypt ; toute autre forme est refusée plutôt qu'interprétée.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isBcrypt(stored)) return bcrypt.compare(plain, stored);
  if (stored.startsWith(`${PREFIX}$`)) return verifyScrypt(plain, stored);
  return false;
}

/**
 * Empreinte d'un mot de passe qui n'existe pas, au format courant.
 *
 * Sert à comparer même quand le compte est inconnu : sans cela la réponse
 * revient bien plus vite pour un email non inscrit, ce qui suffit à dresser la
 * liste des comptes. Calculée au démarrage à partir d'octets aléatoires — elle
 * ne peut donc correspondre à aucun mot de passe, et aucune valeur figée ne
 * traîne dans le dépôt.
 */
export const DUMMY_PASSWORD_HASH: Promise<string> = hashPassword(randomBytes(32).toString("base64url"));

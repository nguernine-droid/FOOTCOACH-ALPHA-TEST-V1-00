import crypto from "node:crypto";

// Alphabet sans caractères ambigus (pas de O/0, I/1…) : codes faciles à dicter
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Code court à partager de vive voix : équipe, affiliation club, coach. */
export function generateCode(): string {
  return Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

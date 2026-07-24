import crypto from "node:crypto";

// Mot de passe temporaire lisible (à transmettre oralement/SMS)
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(10), (b) => alphabet[b % alphabet.length]).join("");
}

import assert from "node:assert/strict";
import test from "node:test";
import { ALLOWED_IMAGE_TYPES, MAX_AVATAR_BYTES, sniffImageType } from "./images.js";

/**
 * Non-régression FC-08 — le type d'un fichier téléversé n'était jamais vérifié
 * au-delà de ce que le client déclarait.
 *
 * `file.mimetype` est le Content-Type écrit par l'appelant. En s'y fiant seul,
 * la route acceptait n'importe quels octets déclarés `image/png` et les servait
 * ensuite publiquement sous /api/uploads/<nom>.png.
 */

const entete = (octets: number[], taille = 64) =>
  Buffer.concat([Buffer.from(octets), Buffer.alloc(Math.max(0, taille - octets.length))]);

const JPEG = entete([0xff, 0xd8, 0xff, 0xe0]);
const PNG = entete([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "latin1"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBPVP8 ", "latin1"),
  Buffer.alloc(32),
]);

test("les trois formats acceptés sont reconnus par leur signature", () => {
  assert.equal(sniffImageType(JPEG), "jpg");
  assert.equal(sniffImageType(PNG), "png");
  assert.equal(sniffImageType(WEBP), "webp");
});

test("ce qui n'est pas une image est refusé, quoi qu'annonce l'appelant", () => {
  const refus = {
    "page HTML": Buffer.from("<html><script>alert(1)</script></html>", "utf8"),
    "SVG (jamais accepté : le seul format image scriptable)": Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      "utf8",
    ),
    "exécutable ELF": entete([0x7f, 0x45, 0x4c, 0x46]),
    "exécutable Windows": entete([0x4d, 0x5a, 0x90, 0x00]),
    "archive ZIP": entete([0x50, 0x4b, 0x03, 0x04]),
    "PDF": Buffer.from("%PDF-1.7\n", "latin1"),
    "GIF (image, mais hors liste)": Buffer.from("GIF89a", "latin1"),
    "fichier vide": Buffer.alloc(0),
  };
  for (const [quoi, buffer] of Object.entries(refus)) {
    assert.equal(sniffImageType(buffer), null, `${quoi} doit être refusé`);
  }
});

test("une signature tronquée ne passe pas pour une image", () => {
  // Le cas piège : les premiers octets d'un PNG, sans le reste. Un test qui ne
  // regarderait que deux ou trois octets se laisserait prendre.
  assert.equal(sniffImageType(Buffer.from([0x89, 0x50, 0x4e])), null);
  assert.equal(sniffImageType(Buffer.from([0xff, 0xd8])), null);
  // « RIFF » sans « WEBP » : un WAV commence exactement comme cela.
  const wav = Buffer.concat([
    Buffer.from("RIFF", "latin1"),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from("WAVEfmt ", "latin1"),
  ]);
  assert.equal(sniffImageType(wav), null, "un WAV ne doit pas passer pour un WebP");
});

test("le type déclaré et le type réel se correspondent terme à terme", () => {
  // La route refuse un envoi dont le contenu contredit la déclaration ; encore
  // faut-il que les deux tables emploient le même vocabulaire.
  for (const [mime, extension] of Object.entries(ALLOWED_IMAGE_TYPES)) {
    const buffer = { jpg: JPEG, png: PNG, webp: WEBP }[extension];
    assert.equal(sniffImageType(buffer), extension, `${mime} doit correspondre à ${extension}`);
  }
});

test("la limite de taille reste une seule valeur, partagée", () => {
  assert.equal(MAX_AVATAR_BYTES, 2 * 1024 * 1024);
});

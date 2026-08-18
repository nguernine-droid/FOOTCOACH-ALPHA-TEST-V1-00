import assert from "node:assert/strict";
import test from "node:test";
import {
  reliabilityLabel,
  reliabilityTone,
  toReliability,
  RELIABILITY_MIN_SAMPLE,
} from "@teamnexus/shared";

/**
 * Le calcul de fiabilité affiche un jugement sur un club, à d'autres clubs. Ce
 * qu'il refuse de dire compte donc autant que ce qu'il dit : un taux calculé
 * sur deux matchs condamnerait sur un accident, et un club injustement peint en
 * rouge ne revient pas.
 */

const none = { played: 0, withdrawn: 0, lateWithdrawn: 0, withdrawnByReason: {} };

test("sans engagement, aucun taux n'est affiché", () => {
  const r = toReliability(none);
  assert.equal(r.rate, null);
  assert.equal(reliabilityTone(r), "unknown");
  assert.equal(reliabilityLabel(r), "Aucun match à son actif");
});

test("sous le seuil d'échantillon, le taux reste tu", () => {
  // Un désistement sur deux matchs ferait « 50 % » — un chiffre indéfendable
  const r = toReliability({ ...none, played: 1, withdrawn: 1 });
  assert.equal(r.commitments, 2);
  assert.equal(r.rate, null);
  assert.equal(reliabilityTone(r), "unknown");
  assert.match(reliabilityLabel(r), /trop peu pour se prononcer/);
});

test("le taux apparaît dès le seuil atteint", () => {
  const r = toReliability({ ...none, played: RELIABILITY_MIN_SAMPLE, withdrawn: 0 });
  assert.equal(r.rate, 0);
  assert.equal(reliabilityTone(r), "good");
});

test("un désistement sur dix reste « honore ses matchs »", () => {
  // Le football amateur annule pour la pluie : une échelle sévère peindrait en
  // rouge des clubs corrects.
  const r = toReliability({ ...none, played: 9, withdrawn: 1 });
  assert.equal(reliabilityTone(r), "good");
});

test("un sur cinq est « quelques désistements », un sur trois est « fréquents »", () => {
  assert.equal(reliabilityTone(toReliability({ ...none, played: 8, withdrawn: 2 })), "fair");
  assert.equal(reliabilityTone(toReliability({ ...none, played: 6, withdrawn: 3 })), "poor");
});

test("les engagements comptent les désistements, pas seulement les matchs joués", () => {
  // Sinon un club qui annule tout afficherait « 0 % sur 0 match »
  const r = toReliability({ ...none, played: 2, withdrawn: 4 });
  assert.equal(r.commitments, 6);
  assert.equal(r.rate, 4 / 6);
  assert.equal(reliabilityTone(r), "poor");
});

test("les motifs sont conservés tels quels, sans pondération", () => {
  // Le taux ne les distingue pas — celui qui s'est retrouvé sans match a subi
  // la même chose — mais l'affichage les montre, pour qu'on puisse en juger.
  const r = toReliability({
    played: 7,
    withdrawn: 3,
    lateWithdrawn: 1,
    withdrawnByReason: { meteo: 2, personnel: 1 },
  });
  assert.deepEqual(r.withdrawnByReason, { meteo: 2, personnel: 1 });
  assert.equal(r.lateWithdrawn, 1);
  assert.equal(r.rate, 0.3);
});

test("le libellé du taux est arrondi et dit sur combien il porte", () => {
  const r = toReliability({ ...none, played: 8, withdrawn: 2 });
  assert.equal(reliabilityLabel(r), "20 % de désistements sur 10 matchs");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  INSTALL_INVITE_SNOOZE_DAYS,
  inviteMemo,
  isInviteSnoozed,
} from "./installInvite.js";

/**
 * Un refus mal mémorisé ne se plaint pas : le coach revoit la même fenêtre à
 * chaque ouverture, et c'est lui qui s'en va. D'où ces tests sur une logique
 * pourtant courte.
 */

const NOW = Date.UTC(2026, 8, 8, 12, 0, 0);
const DAY = 86_400_000;

test("sans rien de mémorisé, la fenêtre s'affiche", () => {
  assert.equal(isInviteSnoozed(null, NOW), false);
  assert.equal(isInviteSnoozed("", NOW), false);
});

test("« ne plus me le proposer » vaut pour toujours", () => {
  const memo = inviteMemo("never", NOW);
  assert.equal(memo, "never");
  assert.equal(isInviteSnoozed(memo, NOW), true);
  // Dix ans plus tard, toujours non
  assert.equal(isInviteSnoozed(memo, NOW + 3650 * DAY), true);
});

test("« plus tard » range la fenêtre une semaine, puis la laisse revenir", () => {
  const memo = inviteMemo("later", NOW);
  assert.equal(isInviteSnoozed(memo, NOW), true, "juste après le refus");
  assert.equal(isInviteSnoozed(memo, NOW + 6 * DAY), true, "la veille de l'échéance");
  assert.equal(
    isInviteSnoozed(memo, NOW + INSTALL_INVITE_SNOOZE_DAYS * DAY),
    false,
    "l'échéance atteinte, on peut reproposer",
  );
});

test("une valeur incompréhensible ne fait pas taire la fenêtre pour toujours", () => {
  // Version précédente, autre onglet, stockage bricolé : dans le doute, on parle
  for (const bizarre of ["oui", "NaN", "{}", "-", "Infinity"]) {
    assert.equal(isInviteSnoozed(bizarre, NOW), false, `« ${bizarre} » ne doit pas ranger la fenêtre`);
  }
});

test("une échéance déjà passée laisse la fenêtre revenir", () => {
  assert.equal(isInviteSnoozed(String(NOW - DAY), NOW), false);
});

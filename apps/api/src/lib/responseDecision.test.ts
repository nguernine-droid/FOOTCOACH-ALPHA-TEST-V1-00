import assert from "node:assert/strict";
import test from "node:test";
import { decisionState, todayKey, type DecisionInput } from "./responseDecision.js";

/**
 * Ce qui se joue ici tient en une phrase : n'offrir un bouton que si le serveur
 * l'honorera. Un bouton qui échoue à chaque appui est pire qu'un bouton absent
 * — le coach ne sait pas si c'est lui, l'appli ou l'autre équipe, et il
 * abandonne sans le dire.
 */

const TODAY = "2026-09-08";
const OWNER_TEAM = "t-annonce";
const RESPONDER_TEAM = "t-repondant";

function state(over: Partial<DecisionInput> = {}) {
  return decisionState({
    myTeamId: OWNER_TEAM,
    announcementTeamId: OWNER_TEAM,
    announcementStatus: "open",
    announcementDate: "2026-09-20",
    responseTeamId: RESPONDER_TEAM,
    responseStatus: "pending",
    ownerConfirmedAt: null,
    responderConfirmedAt: null,
    today: TODAY,
    ...over,
  });
}

test("chacun des deux côtés du fil peut signer", () => {
  const owner = state();
  assert.equal(owner.side, "owner");
  assert.ok(owner.decidable);

  const responder = state({ myTeamId: RESPONDER_TEAM });
  assert.equal(responder.side, "responder");
  assert.ok(responder.decidable);
});

test("un tiers ne signe rien, et ne voit aucun bouton", () => {
  const outsider = state({ myTeamId: "t-autre" });
  assert.equal(outsider.side, null);
  assert.ok(!outsider.decidable);
  assert.ok(!outsider.iConfirmed);
  assert.ok(!outsider.otherConfirmed);
});

test("un coach sans équipe ne peut pas engager d'équipe", () => {
  assert.equal(state({ myTeamId: null }).side, null);
  assert.ok(!state({ myTeamId: null }).decidable);
});

test("ma signature retire mon bouton, celle d'en face ne le retire pas", () => {
  const jAiSigne = state({ ownerConfirmedAt: new Date() });
  assert.ok(jAiSigne.iConfirmed);
  assert.ok(!jAiSigne.decidable);

  const lAutreASigne = state({ responderConfirmedAt: new Date() });
  assert.ok(lAutreASigne.otherConfirmed);
  assert.ok(lAutreASigne.decidable, "il manque toujours la mienne");
});

test("les deux côtés lisent les mêmes signatures, chacun du sien", () => {
  const signatures = { ownerConfirmedAt: new Date(), responderConfirmedAt: null };
  const owner = state(signatures);
  const responder = state({ ...signatures, myTeamId: RESPONDER_TEAM });
  assert.deepEqual(
    [owner.iConfirmed, owner.otherConfirmed],
    [responder.otherConfirmed, responder.iConfirmed],
  );
});

/* ─────────── Le défaut corrigé : le bouton condamné d'avance ──────────── */

test("une date passée ferme la validation, même sur une annonce encore ouverte", () => {
  // Le cas exact rencontré en production : annonce `open`, match du 26 août.
  const perimee = state({ announcementDate: "2026-08-26" });
  assert.equal(perimee.blockedReason, "expired");
  assert.ok(!perimee.decidable, "le serveur refuserait : ne pas proposer le geste");
});

test("une annonce qui n'est plus ouverte ferme la validation", () => {
  assert.equal(state({ announcementStatus: "cancelled" }).blockedReason, "closed");
  assert.equal(state({ announcementStatus: "matched" }).blockedReason, "closed");
  assert.ok(!state({ announcementStatus: "cancelled" }).decidable);
});

test("le jour même reste jouable : c'est « passée », pas « aujourd'hui »", () => {
  const aujourdhui = state({ announcementDate: TODAY });
  assert.equal(aujourdhui.blockedReason, null);
  assert.ok(aujourdhui.decidable);
});

test("l'annonce est examinée avant la date, comme le fait le serveur", () => {
  // Annulée ET périmée : c'est l'annonce qu'on nomme, le motif le plus général
  assert.equal(
    state({ announcementStatus: "cancelled", announcementDate: "2026-08-26" }).blockedReason,
    "closed",
  );
});

test("une proposition tranchée n'est pas « bloquée » : elle est finie", () => {
  for (const responseStatus of ["accepted", "declined"]) {
    const done = state({ responseStatus, announcementStatus: "cancelled" });
    assert.equal(done.blockedReason, null, `« ${responseStatus} » ne doit pas inquiéter`);
    assert.ok(!done.decidable);
  }
});

test("todayKey rend la date locale au format des colonnes date", () => {
  assert.equal(todayKey(new Date(2026, 8, 8, 23, 30)), "2026-09-08");
  assert.equal(todayKey(new Date(2026, 0, 1, 0, 5)), "2026-01-01");
});

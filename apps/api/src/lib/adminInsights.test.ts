import assert from "node:assert/strict";
import test from "node:test";
import {
  computeInsights,
  hasAnySignature,
  hasBothSignatures,
  isDeadPending,
  medianHours,
  mondayOf,
  type InsightAnnouncementRow,
  type InsightInput,
  type InsightResponseRow,
} from "./adminInsights.js";

/**
 * Un tableau de bord se lit vite et se retient longtemps : s'il se trompe, la
 * décision se trompe avec lui, et personne ne remonte au calcul. Ces tests
 * fixent donc ce qui compte comme un passage — et surtout ce qui n'en est pas
 * un : une proposition sans signature n'est pas un match, une annonce annulée
 * n'est pas une déception de plus à mettre au débit de l'appariement.
 */

const NOW = new Date("2026-09-08T12:00:00Z");
const TODAY = "2026-09-08";

function announcement(over: Partial<InsightAnnouncementRow> = {}): InsightAnnouncementRow {
  return {
    id: "a1",
    teamId: "t1",
    status: "open",
    date: "2026-09-20",
    category: "U14-U15",
    format: "11v11",
    gender: "masculin",
    isSos: false,
    viewCount: 0,
    createdAt: new Date("2026-09-01T10:00:00Z"),
    ...over,
  };
}

function response(over: Partial<InsightResponseRow> = {}): InsightResponseRow {
  return {
    id: "r1",
    announcementId: "a1",
    teamId: "t2",
    status: "pending",
    ownerConfirmedAt: null,
    responderConfirmedAt: null,
    createdAt: new Date("2026-09-02T10:00:00Z"),
    ...over,
  };
}

function input(over: Partial<InsightInput> = {}): InsightInput {
  return {
    now: NOW,
    today: TODAY,
    announcements: [],
    responses: [],
    matches: [],
    teams: [],
    coaches: [],
    teamCoaches: [],
    logins: [],
    lastLogins: [],
    upcomingAvailabilities: [],
    departmentOf: () => null,
    conversations: 0,
    messages: 0,
    openReports: 0,
    ...over,
  };
}

/* ─────────────────────────── Les briques ──────────────────────────────── */

test("une médiane sur trop peu d'observations n'est pas publiée", () => {
  assert.equal(medianHours([3_600_000, 7_200_000]), null);
  assert.equal(medianHours([3_600_000, 7_200_000, 10_800_000]), 2);
});

test("la médiane prend la moyenne des deux valeurs centrales sur un effectif pair", () => {
  // 1 h, 2 h, 4 h, 5 h -> (2 + 4) / 2
  assert.equal(medianHours([1, 2, 4, 5].map((h) => h * 3_600_000)), 3);
});

test("une signature ne vaut pas les deux", () => {
  const one = response({ ownerConfirmedAt: NOW });
  assert.ok(hasAnySignature(one));
  assert.ok(!hasBothSignatures(one));
  const both = response({ ownerConfirmedAt: NOW, responderConfirmedAt: NOW });
  assert.ok(hasBothSignatures(both));
});

test("une proposition est bloquée dès que son annonce ne peut plus la recevoir", () => {
  const vivante = announcement({ status: "open", date: "2026-09-20" });
  assert.ok(!isDeadPending(response(), vivante, TODAY));

  // Ce sont exactement les deux refus de la route de validation
  assert.ok(isDeadPending(response(), announcement({ status: "cancelled" }), TODAY));
  assert.ok(isDeadPending(response(), announcement({ date: "2026-08-26" }), TODAY));

  // Déjà tranchée : ce n'est plus un blocage, c'est une décision
  assert.ok(!isDeadPending(response({ status: "declined" }), vivante, TODAY));
  assert.ok(!isDeadPending(response({ status: "accepted" }), vivante, TODAY));
});

test("le lundi d'une semaine est le même du lundi au dimanche", () => {
  assert.equal(mondayOf(new Date(2026, 8, 7)), "2026-09-07"); // lundi
  assert.equal(mondayOf(new Date(2026, 8, 13)), "2026-09-07"); // dimanche suivant
  assert.equal(mondayOf(new Date(2026, 8, 14)), "2026-09-14"); // lundi d'après
});

/* ────────────────────────── L'entonnoir ───────────────────────────────── */

test("l'entonnoir des annonces sépare vue, répondue, signée et jouée", () => {
  const out = computeInsights(
    input({
      announcements: [
        announcement({ id: "vue-et-repondue", viewCount: 4 }),
        announcement({ id: "vue-seulement", viewCount: 2 }),
        announcement({ id: "jamais-vue" }),
      ],
      responses: [response({ id: "r1", announcementId: "vue-et-repondue" })],
    }),
  );
  const step = (key: string) => out.announcementFunnel.find((s) => s.key === key)!.count;
  assert.equal(step("published"), 3);
  assert.equal(step("seen"), 2);
  assert.equal(step("answered"), 1);
  // Aucune signature : le parcours s'arrête là, et c'est le fait à voir
  assert.equal(step("signed"), 0);
  assert.equal(step("matched"), 0);
  assert.equal(step("played"), 0);
});

test("une proposition sans signature ne compte comme match à aucune marche", () => {
  const out = computeInsights(
    input({
      announcements: [announcement({ viewCount: 1 })],
      responses: [response({ ownerConfirmedAt: NOW })],
    }),
  );
  assert.equal(out.announcementFunnel.find((s) => s.key === "signed")!.count, 1);
  assert.equal(out.announcementFunnel.find((s) => s.key === "matched")!.count, 0);
  assert.equal(out.responseFunnel.find((s) => s.key === "one")!.count, 1);
  assert.equal(out.responseFunnel.find((s) => s.key === "two")!.count, 0);
});

/* ────────────────────────── L'activation ──────────────────────────────── */

test("l'activation compte des coachs, pas des actions", () => {
  const out = computeInsights(
    input({
      announcements: [announcement({ id: "a1", teamId: "t1" }), announcement({ id: "a2", teamId: "t1" })],
      responses: [response({ announcementId: "a1", teamId: "t2" })],
      coaches: [
        { id: "c1", createdAt: new Date("2026-08-01T10:00:00Z") },
        { id: "c2", createdAt: new Date("2026-08-01T10:00:00Z") },
        { id: "c3", createdAt: new Date("2026-08-01T10:00:00Z") },
      ],
      teamCoaches: [
        { coachId: "c1", teamId: "t1" },
        { coachId: "c2", teamId: "t2" },
      ],
      lastLogins: [{ userId: "c1", lastAt: new Date("2026-09-07T10:00:00Z") }],
    }),
  );
  // Deux annonces de la même équipe : un seul coach « a publié »
  assert.equal(out.activation.published, 1);
  assert.equal(out.activation.responded, 1);
  assert.equal(out.activation.signed, 0);
  // c2 n'a qu'une connexion le jour de l'inscription, c3 aucune
  assert.equal(out.activation.neverReturned, 2);
});

test("un coach désactivé ne gonfle aucun taux d'activation", () => {
  const out = computeInsights(
    input({
      announcements: [announcement({ teamId: "t1" })],
      // c9 encadre t1 mais n'est pas dans la liste des coachs actifs
      coaches: [{ id: "c1", createdAt: NOW }],
      teamCoaches: [
        { coachId: "c1", teamId: "t1" },
        { coachId: "c9", teamId: "t1" },
      ],
    }),
  );
  assert.equal(out.activation.coaches, 1);
  assert.equal(out.activation.published, 1);
});

/* ───────────────────────── Liquidité et frictions ─────────────────────── */

test("un département n'est dense qu'à partir de deux équipes", () => {
  const byCity: Record<string, string> = { Lyon: "69", Villeurbanne: "69", Brest: "29" };
  const out = computeInsights(
    input({
      teams: [
        { id: "t1", city: "Lyon" },
        { id: "t2", city: "Villeurbanne" },
        { id: "t3", city: "Brest" },
      ],
      departmentOf: (city) => byCity[city] ?? null,
    }),
  );
  assert.equal(out.liquidity.departments, 2);
  assert.equal(out.liquidity.denseDepartments, 1);
  // Brest est seul : personne à qui jouer sur place
  assert.equal(out.liquidity.isolatedTeams, 1);
});

test("seule une annonce ouverte et à venir compte dans le stock disponible", () => {
  const out = computeInsights(
    input({
      announcements: [
        announcement({ id: "a-venir", date: "2026-09-20" }),
        announcement({ id: "passee", date: "2026-08-26" }),
        announcement({ id: "annulee", status: "cancelled", date: "2026-09-20" }),
      ],
    }),
  );
  assert.equal(out.liquidity.openUpcoming, 1);
});

test("une annonce périmée sans la moindre proposition est de la demande jamais servie", () => {
  const out = computeInsights(
    input({
      announcements: [
        announcement({ id: "servie", date: "2026-08-26" }),
        announcement({ id: "ignoree", date: "2026-08-26" }),
        // Périmée mais qui a trouvé son adversaire : ce n'est pas un échec
        announcement({ id: "aboutie", status: "matched", date: "2026-08-26" }),
      ],
      responses: [response({ announcementId: "servie" })],
    }),
  );
  assert.equal(out.friction.expiredUnanswered, 1);
});

test("les propositions définitivement bloquées sont comptées à part des dormantes", () => {
  const out = computeInsights(
    input({
      announcements: [
        announcement({ id: "vivante", status: "open", date: "2026-09-20" }),
        announcement({ id: "morte", status: "cancelled", date: "2026-09-20" }),
      ],
      responses: [
        // Sans signature depuis plus d'une semaine, mais encore récupérable
        response({ id: "r1", announcementId: "vivante", createdAt: new Date("2026-08-20T10:00:00Z") }),
        response({ id: "r2", announcementId: "morte", createdAt: new Date("2026-09-07T10:00:00Z") }),
      ],
    }),
  );
  assert.equal(out.timing.stalePending, 1);
  assert.equal(out.timing.deadPending, 1);
});

test("la courbe de croissance couvre douze semaines, même vides", () => {
  const out = computeInsights(
    input({
      coaches: [{ id: "c1", createdAt: new Date(2026, 8, 8) }],
      logins: [{ userId: "c1", createdAt: new Date(2026, 8, 8) }],
    }),
  );
  assert.equal(out.growth.length, 12);
  const last = out.growth[out.growth.length - 1];
  assert.equal(last.week, mondayOf(new Date(2026, 8, 8)));
  assert.equal(last.signups, 1);
  assert.equal(last.active, 1);
});

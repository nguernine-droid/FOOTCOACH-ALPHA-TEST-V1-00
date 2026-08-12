import assert from "node:assert/strict";
import test from "node:test";
import { teamMatchesAnnouncement } from "@teamnexus/shared";

/**
 * Appariement d'une équipe qui propose avec l'annonce qu'elle vise. Rien n'est
 * bloqué par ces règles — elles servent à AVERTIR l'émetteur avant qu'il
 * accepte. D'où le soin porté aux cas où il ne faut RIEN dire : un faux
 * avertissement ferait décliner des propositions parfaitement valables.
 */

const U13_MASCULIN = { category: "U13", gender: "masculin" } as const;

test("la catégorie se compare par groupe d'âges, pas à la lettre", () => {
  // Une équipe U13 répond à une annonce U12-U13 : c'est l'appariement du district.
  assert.deepEqual(teamMatchesAnnouncement(U13_MASCULIN, { category: "U12-U13", gender: "masculin" }), {
    category: true,
    gender: true,
  });
  // U14-U15 est un autre tableau : l'écart doit se voir.
  assert.equal(
    teamMatchesAnnouncement(U13_MASCULIN, { category: "U14-U15", gender: "masculin" })?.category,
    false,
  );
});

test("le mixte s'apparie avec tout le monde, des deux côtés", () => {
  assert.equal(
    teamMatchesAnnouncement({ category: "U11", gender: "mixte" }, { category: "U10-U11", gender: "masculin" })
      ?.gender,
    true,
  );
  assert.equal(
    teamMatchesAnnouncement(U13_MASCULIN, { category: "U12-U13", gender: "mixte" })?.gender,
    true,
  );
});

test("masculin et féminin ne s'apparient pas", () => {
  assert.equal(
    teamMatchesAnnouncement(U13_MASCULIN, { category: "U12-U13", gender: "feminin" })?.gender,
    false,
  );
});

test("ce qu'on ne sait pas ne s'oppose à rien", () => {
  // Équipe sans aucune référence (créée avant qu'on les demande) : rien à dire.
  assert.equal(teamMatchesAnnouncement({ category: null, gender: null }, { category: "U12-U13", gender: "masculin" }), null);
  // Une seule référence connue : on ne juge que celle-là.
  assert.deepEqual(
    teamMatchesAnnouncement({ category: "U13", gender: null }, { category: "U14-U15", gender: "feminin" }),
    { category: false, gender: true },
  );
  // Annonce sans genre (publiée avant le champ) : elle n'écarte personne.
  assert.equal(
    teamMatchesAnnouncement(U13_MASCULIN, { category: "U12-U13", gender: null })?.gender,
    true,
  );
});

test("une catégorie hors liste ne fabrique pas un désaccord", () => {
  // Valeur inconnue des deux côtés du regroupement : on ne peut rien conclure,
  // et conclure quand même reviendrait à décourager une bonne proposition.
  assert.equal(
    teamMatchesAnnouncement({ category: "U13", gender: "masculin" }, { category: "Loisir", gender: "masculin" })
      ?.category,
    true,
  );
});

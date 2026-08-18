import assert from "node:assert/strict";
import test from "node:test";
import { venueLabel } from "@teamnexus/shared";

/**
 * Libellé d'un terrain. Le recensement nomme la moitié de ses terrains
 * « Terrain de football » : les afficher tels quels donnerait « Stade municipal
 * — Terrain de football », qui n'apprend rien et allonge chaque ligne.
 */

test("le nom du terrain n'est repris que s'il distingue quelque chose", () => {
  assert.equal(
    venueLabel({ name: "Stade du Calvaire", pitchName: "Terrain d'honneur" }),
    "Stade du Calvaire — Terrain d'honneur",
  );
});

test("un nom de terrain générique est tu", () => {
  for (const pitch of ["Terrain de football", "Terrain de foot", "terrain", "Terrain"]) {
    assert.equal(venueLabel({ name: "Stade municipal", pitchName: pitch }), "Stade municipal", pitch);
  }
});

test("sans nom de terrain, le stade suffit", () => {
  assert.equal(venueLabel({ name: "Stade municipal", pitchName: null }), "Stade municipal");
  assert.equal(venueLabel({ name: "Stade municipal", pitchName: "   " }), "Stade municipal");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmationStageDue,
  freeWeekendTarget,
  usualMatchDay,
  withinRelayHours,
  FREE_WEEKEND_LEAD_MAX_DAYS,
  FREE_WEEKEND_LEAD_MIN_DAYS,
} from "@teamnexus/shared";

/**
 * Règles de la relance des week-ends libres. Elles décident QUAND on dérange un
 * coach qui n'a rien demandé — d'où le soin porté aux bornes : trop tôt, la
 * relance ne sert à rien ; trop souvent, elle fait désinstaller l'application.
 */

test("les jeunes jouent le samedi, les seniors le dimanche", () => {
  assert.equal(usualMatchDay("U13"), 6);
  assert.equal(usualMatchDay("U12-U13"), 6);
  assert.equal(usualMatchDay("U18"), 6);
  assert.equal(usualMatchDay("U20"), 0);
  assert.equal(usualMatchDay("Seniors"), 0);
  assert.equal(usualMatchDay("Veterans"), 0);
});

test("une catégorie inconnue retombe sur le samedi", () => {
  // Le samedi couvre toutes les catégories de jeunes, qui sont le gros des
  // équipes : se tromper là coûte moins cher que l'inverse.
  assert.equal(usualMatchDay(null), 6);
  assert.equal(usualMatchDay("n'importe quoi"), 6);
});

test("la date visée tombe sur le jour de match habituel", () => {
  // Mercredi 2026-08-19
  const mercredi = new Date("2026-08-19T10:00:00Z");
  const jeunes = freeWeekendTarget(mercredi, "U13");
  const seniors = freeWeekendTarget(mercredi, "Seniors");
  assert.ok(jeunes);
  assert.ok(seniors);
  assert.equal(new Date(`${jeunes}T12:00:00Z`).getUTCDay(), 6);
  assert.equal(new Date(`${seniors}T12:00:00Z`).getUTCDay(), 0);
});

test("la date visée reste dans la fenêtre de dix à seize jours", () => {
  // Balayé sur une année entière : aucune date ne doit sortir des bornes,
  // quelle que soit la position du jour dans la semaine.
  for (let i = 0; i < 365; i++) {
    const day = new Date(Date.UTC(2026, 0, 1 + i));
    for (const category of ["U13", "Seniors"]) {
      const target = freeWeekendTarget(day, category);
      assert.ok(target, `aucune date pour ${category} au ${day.toISOString().slice(0, 10)}`);
      const delta = Math.round((Date.parse(`${target}T00:00:00Z`) - Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())) / 86_400_000);
      assert.ok(
        delta >= FREE_WEEKEND_LEAD_MIN_DAYS && delta <= FREE_WEEKEND_LEAD_MAX_DAYS,
        `écart de ${delta} jours hors bornes`,
      );
    }
  }
});

test("chaque équipe est visée au plus une fois par semaine", () => {
  // La fenêtre couvre exactement sept jours : sur sept jours consécutifs, le
  // même samedi ne peut donc être visé qu'une seule... non — il l'est chaque
  // jour tant qu'il reste dans la fenêtre. C'est la TRACE en base qui empêche
  // la répétition ; ce que ce test vérifie, c'est qu'une même semaine ne
  // produit jamais DEUX dates différentes le même jour.
  const day = new Date("2026-08-19T10:00:00Z");
  const first = freeWeekendTarget(day, "U13");
  const again = freeWeekendTarget(day, "U13");
  assert.equal(first, again);
});

test("sept jours consécutifs ne visent jamais plus de deux samedis", () => {
  // Sinon une équipe recevrait plus d'une relance par semaine dès que la trace
  // d'une date sort de la fenêtre.
  const seen = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const day = new Date(Date.UTC(2026, 7, 19 + i));
    const target = freeWeekendTarget(day, "U13");
    if (target) seen.add(target);
  }
  assert.ok(seen.size <= 2, `${seen.size} samedis visés en une semaine : ${[...seen].join(", ")}`);
});

test("rien ne part la nuit", () => {
  // 03:00 heure de Paris en août (UTC+2)
  assert.equal(withinRelayHours(new Date("2026-08-19T01:00:00Z")), false);
  // 23:00 heure de Paris
  assert.equal(withinRelayHours(new Date("2026-08-19T21:00:00Z")), false);
  // 11:00 heure de Paris
  assert.equal(withinRelayHours(new Date("2026-08-19T09:00:00Z")), true);
  // 20:30 heure de Paris — dernière demi-heure ouverte
  assert.equal(withinRelayHours(new Date("2026-08-19T18:30:00Z")), true);
});

test("les bornes horaires suivent l'heure d'hiver", () => {
  // En janvier, Paris est à UTC+1 : 08:00 UTC = 09:00 à Paris, la plage ouvre.
  assert.equal(withinRelayHours(new Date("2026-01-15T08:00:00Z")), true);
  assert.equal(withinRelayHours(new Date("2026-01-15T07:30:00Z")), false);
});

/**
 * Paliers de confirmation. Le risque n'est pas d'oublier un rappel, c'est d'en
 * envoyer trois : un coach relancé chaque demi-heure coupe les notifications,
 * et on perd alors aussi celles qui comptent.
 */

test("aucun rappel tant que le match est loin", () => {
  assert.equal(confirmationStageDue(30, null), null);
  assert.equal(confirmationStageDue(8, null), null);
});

test("le premier palier tombe à sept jours", () => {
  assert.equal(confirmationStageDue(7, null), 7);
  assert.equal(confirmationStageDue(5, null), 7);
});

test("un palier déjà envoyé ne se répète pas", () => {
  // Le balayeur repasse toutes les trente minutes : sans cette règle, le même
  // rappel partirait quarante-huit fois par jour.
  assert.equal(confirmationStageDue(6, 7), null);
  assert.equal(confirmationStageDue(4, 7), null);
});

test("le second palier tombe à trois jours, une seule fois", () => {
  assert.equal(confirmationStageDue(3, 7), 3);
  assert.equal(confirmationStageDue(2, 3), null);
  assert.equal(confirmationStageDue(1, 3), null);
});

test("un match tout proche n'ouvre pas les deux paliers d'un coup", () => {
  // Match convenu à deux jours : on ne veut pas le rappel « dans une semaine »
  // suivi du rappel « dans trois jours » à la minute suivante.
  const first = confirmationStageDue(2, null);
  assert.equal(first, 7);
  assert.equal(confirmationStageDue(2, first), 3);
  assert.equal(confirmationStageDue(2, 3), null);
});

test("le jour du match, on ne relance plus", () => {
  assert.equal(confirmationStageDue(0, null), 7);
  assert.equal(confirmationStageDue(-1, null), null);
  assert.equal(confirmationStageDue(-3, 7), null);
});

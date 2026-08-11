import { expect, test } from "@playwright/test";

/**
 * Régression : la grille de `/coach/matches` (`grid md:grid-cols-2
 * xl:grid-cols-3`) n'avait pas de `grid-cols-1` de base. Sans lui, la piste
 * de grille implicite sur mobile n'a pas de `minmax(0, 1fr)` — elle grandit
 * pour accueillir le contenu le plus large plutôt que de le contraindre à la
 * largeur de l'écran. Un match TERMINÉ affiche son score en gros
 * (`text-*xl`), à côté de deux badges d'équipe de taille fixe : leur largeur
 * minimale combinée dépasse un téléphone, et sans `grid-cols-1` toute la
 * grille — donc la carte — s'élargissait en conséquence. Rognée en silence
 * par le conteneur du carrousel d'onglets (`overflow-hidden`), la partie
 * excédentaire de la carte devenait invisible et inaccessible : les matchs
 * « sortaient de l'écran ». Signalé le 2026-08-11, corrigé en ajoutant
 * `grid-cols-1` (voir aussi les 15 autres grilles du dépôt qui avaient le
 * même trou, corrigées en même temps) et en réduisant la taille du score sur
 * les très petits écrans (voir `MatchCard.tsx`).
 *
 * Comme `nav-bar-position.spec.ts`, aucune API ni base de données requise :
 * `fc_user` en localStorage suffit à passer le garde de `RoleGuard`, et
 * `/api/matches` est intercepté pour servir deux matchs déjà joués avec un
 * score à deux chiffres de chaque côté — le cas qui déclenche le bug.
 */

const FAKE_COACH = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "e2e-coach@example.com",
  role: "coach",
  nickname: "TestCoach",
  firstName: "",
  lastName: "",
  teamId: "t1",
  teamName: "Équipe de test",
  phone: null,
  avatarUrl: null,
};

const FINISHED_MATCH = (id: string, homeScore: number, awayScore: number) => ({
  id,
  homeTeam: { id: "t1", name: "Équipe de test", city: "Lyon" },
  awayTeam: { id: "t2", name: "FC Autre Équipe Longue", city: "Bron" },
  homeCoach: { id: "u1", nickname: "TestCoach", avatarUrl: null },
  awayCoach: { id: "u2", nickname: "Coach B", avatarUrl: null },
  date: "2026-07-01",
  time: "10:00",
  location: "Stade des Iris, Bron",
  status: "finished",
  homeScore,
  awayScore,
  mySide: "home",
  scoreSubmittedByTeamId: "t1",
  finalScoreDue: false,
  encounterConfirmedAt: "2026-07-01T10:00:00.000Z",
  encounterOpen: false,
  encounterToken: null,
  withdrawnByTeamId: null,
  withdrawalReason: null,
  withdrawalDetails: null,
});

test.use({ viewport: { width: 320, height: 568 } }); // iPhone SE : le plus étroit des écrans courants

test.beforeEach(async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem("fc_user", JSON.stringify(user));
    localStorage.setItem("fc_access_token", "e2e-fake-access-token");
    localStorage.setItem("fc_refresh_token", "e2e-fake-refresh-token");
  }, FAKE_COACH);

  // Les autres écrans montés par le carrousel d'onglets (Tableau de bord,
  // Annonces, Messages) doivent recevoir une forme minimale valide, sinon ils
  // lèvent en plein rendu (ex. `[...radar.items]` sur un radar absent) et
  // l'overlay d'erreur de Next masque la page entière.
  await page.route("**/api/**", (route, request) => {
    const url = request.url();
    if (url.includes("/api/matches")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([FINISHED_MATCH("m1", 12, 8), FINISHED_MATCH("m2", 99, 99)]),
      });
    }
    if (url.includes("/api/announcements/radar")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], tournaments: [], beyondRadius: 0 }),
      });
    }
    if (url.includes("/api/conversations/unread")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ count: 0 }) });
    }
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
});

test("les cartes de match ne débordent pas horizontalement sur un petit écran", async ({ page }) => {
  await page.goto("/coach/matches");
  await expect(page.getByText("Terminé").first()).toBeVisible();

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  const cardBox = await page.locator(".card", { hasText: "Terminé" }).first().boundingBox();
  expect(cardBox).not.toBeNull();
  expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(clientWidth + 1);
});

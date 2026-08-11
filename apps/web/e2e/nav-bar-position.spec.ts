import { expect, test } from "@playwright/test";

/**
 * Régression : la barre d'onglets mobile (`.app-tabbar`, `position: fixed;
 * bottom: 0`) est un descendant de `.app-header`, qui porte un
 * `backdrop-filter` pour son effet de verre. Sous WebKit (Safari, donc
 * l'iPhone du terrain), un `backdrop-filter` établit un bloc de confinement
 * pour ses descendants en `position: fixed`, au même titre qu'un
 * `transform` — sans portail vers `document.body` (voir `AppTabs.tsx`), la
 * barre s'ancre au bord du header, tout en haut de l'écran, au lieu du bas de
 * la fenêtre. Bug réel, signalé le 2026-08-11, reproduit et vérifié ici :
 * sous WebKit la barre remonte à `y≈7px` sans le portail, contre `y≈787px`
 * (bas de l'écran) avec. **Chromium NE reproduit PAS ce bug** — vérifié en
 * pratique, ce test y passe même sur le code fautif — d'où `webkit` comme
 * projet Playwright dans `playwright.config.ts`, indispensable et non
 * cosmétique. Impossible à couvrir par un test unitaire en jsdom, qui ne
 * fait aucune mise en page.
 *
 * Aucune API ni base de données requise : `fc_user` est posé directement en
 * localStorage avant la navigation, RoleGuard ne lit que cette clé pour
 * décider d'afficher la coque de l'application (voir `getStoredUser` dans
 * `src/lib/api.ts`) ; les appels réseau qui suivent échouent silencieusement,
 * déjà tolérés par l'app (états vides).
 */

const FAKE_COACH = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "e2e-coach@example.com",
  role: "coach",
  nickname: "TestCoach",
  firstName: "",
  lastName: "",
  teamId: null,
  teamName: "Équipe de test",
  phone: null,
  avatarUrl: null,
};

test.use({ viewport: { width: 390, height: 844 } }); // < 960px : bascule sur la barre mobile

test.beforeEach(async ({ page }) => {
  await page.addInitScript((user) => {
    localStorage.setItem("fc_user", JSON.stringify(user));
    localStorage.setItem("fc_access_token", "e2e-fake-access-token");
    localStorage.setItem("fc_refresh_token", "e2e-fake-refresh-token");
  }, FAKE_COACH);
});

test("la barre d'onglets mobile reste ancrée au bas de l'écran", async ({ page }) => {
  await page.goto("/coach");

  const tabbar = page.locator("nav.app-tabbar");
  await expect(tabbar).toBeVisible();

  const box = await tabbar.boundingBox();
  expect(box).not.toBeNull();
  const viewportHeight = page.viewportSize()!.height;

  // Le bord bas de la barre doit toucher (à peu près) le bas de la fenêtre.
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(viewportHeight - 2);
  // Et son bord haut doit rester dans le tiers bas de l'écran — si un
  // `backdrop-filter` ancêtre recapture le `fixed`, la barre remonte tout en
  // haut (y proche de la hauteur du header, très inférieur à ce seuil).
  expect(box!.y).toBeGreaterThan(viewportHeight * 0.66);
});

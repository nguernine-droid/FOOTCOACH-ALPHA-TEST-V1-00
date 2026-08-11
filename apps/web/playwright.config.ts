import { defineConfig, devices } from "@playwright/test";

/**
 * E2E minimal, sans API ni base de données : les tests ne couvrent que ce que
 * le navigateur peut vérifier par lui-même (mise en page, CSS réel — ce
 * qu'aucun test unitaire en jsdom ne sait faire, faute de moteur de rendu).
 * La session est simulée en posant directement `fc_user` en localStorage
 * (voir e2e/nav-bar-position.spec.ts) : les appels à l'API échouent alors
 * silencieusement (déjà tolérés par l'app), la coque (header, onglets)
 * s'affiche sans backend.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    // `localhost`, pas `127.0.0.1` : la protection cross-origin du serveur de
    // dev de Next.js les distingue et bloque silencieusement le chargement des
    // chunks JS pour l'un des deux, laissant la page bloquée sur son rendu
    // serveur (le squelette de chargement) sans jamais hydrater.
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  // WebKit N'EST PAS optionnel ici : ce bug précis (position: fixed capturé
  // par le backdrop-filter d'un ancêtre) ne se reproduit PAS sous Chromium —
  // vérifié en pratique, le même test y passe sur le code fautif. Seul WebKit
  // (le moteur de Safari, celui de l'iPhone du terrain) le reproduit. Un test
  // qui ne tournerait que sous Chromium donnerait une fausse confiance.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});

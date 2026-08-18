import { expect, test } from "@playwright/test";

/**
 * L'aperçu public des annonces — la page qu'on atteint depuis « Voir les
 * annonces ».
 *
 * Ces tests tournent SANS API (voir `playwright.config.ts`) : ils vérifient
 * donc ce qui ne dépend pas des données — le chemin emprunté depuis la vitrine,
 * la tenue de la mise en page, et surtout que l'absence de réponse du serveur
 * produise un message et non une page cassée. Le contenu réel, lui, se vérifie
 * en production, là où il y a des annonces.
 */

test.describe("Annonces publiques", () => {
  test("« Voir les annonces » mène à l'aperçu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Voir les annonces" }).click();
    await expect(page).toHaveURL(/\/f$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/cherche un match/i);
  });

  test("l'API muette donne un message, pas une page blanche", async ({ page }) => {
    // Sans backend, `fetchLatestAnnouncements` renvoie null : la page doit le
    // dire. C'est le cas le plus probable en incident, et le plus facile à
    // laisser dégénérer en écran vide sans que personne ne s'en aperçoive.
    await page.goto("/f");
    await expect(page.getByText(/momentanément indisponible|Aucune annonce ouverte/i)).toBeVisible();
  });

  test("l'invitation à créer un compte est présente", async ({ page }) => {
    await page.goto("/f");
    await expect(page.getByRole("link", { name: "Créer un compte coach" }).first()).toBeVisible();
  });

  test("aucun débordement horizontal à 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/f");
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    );
    expect(fits).toBe(true);
  });
});

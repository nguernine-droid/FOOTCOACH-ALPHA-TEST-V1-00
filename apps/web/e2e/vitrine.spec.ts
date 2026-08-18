import { expect, test, type Page } from "@playwright/test";

/**
 * La vitrine : mise en page et accessibilité, vérifiées dans un vrai moteur.
 *
 * Ce que ces tests protègent, précisément :
 *
 * 1. LE DÉBORDEMENT HORIZONTAL. Le héros pose des cartes satellites qui
 *    dépassent volontairement des bords du mockup (`-left-16`, `-right-14`).
 *    C'est exactement le genre de décoration qui ajoute une barre de défilement
 *    latérale sur un téléphone sans que personne ne le remarque en développant
 *    sur un grand écran. `overflow-x: clip` sur `.vitrine-root` est censé
 *    l'empêcher — ce test est là pour le jour où quelqu'un le retirera.
 *
 * 2. LA PAGE VISIBLE. Les entrées au défilement partent d'une opacité nulle.
 *    Une erreur dans l'observateur, et la page reste blanche : c'est la panne
 *    la plus grave possible ici, et la plus silencieuse.
 *
 * WebKit n'est pas optionnel (voir `playwright.config.ts`) : c'est le moteur de
 * l'iPhone, et c'est là que les effets de `backdrop-filter` de la barre de
 * navigation divergent de Chromium.
 */

/** Les largeurs qui comptent : petit téléphone, iPhone courant, tablette, bureau. */
const WIDTHS = [320, 375, 768, 1440];

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    // Une tolérance d'un pixel : les arrondis de sous-pixel d'un zoom ou d'une
    // barre de défilement ne sont pas un débordement de mise en page.
    return doc.scrollWidth <= doc.clientWidth + 1;
  });
}

test.describe("Vitrine — page d'accueil", () => {
  for (const width of WIDTHS) {
    test(`aucun débordement horizontal à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);

      // Et toujours pas après avoir parcouru la page : les sections basses ont
      // leurs propres halos et débordements.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      expect(await noHorizontalScroll(page)).toBe(true);
    });
  }

  for (const width of WIDTHS) {
    test(`le bouton d'inscription de la barre tient entier à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      // `overflow-x: clip` sur la racine empêche la barre de défilement
      // horizontale — mais il ROGNE ce qui dépasse au lieu de le révéler. Le
      // test de débordement ci-dessus ne peut donc pas voir un bouton coupé :
      // celui-ci le mesure directement.
      const cta = page.locator("header").getByRole("link", { name: "Créer un compte" });
      const box = await cta.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    });
  }

  test("le contenu est visible, pas seulement présent", async ({ page }) => {
    await page.goto("/");
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toBeVisible();
    // `toBeVisible` ne regarde pas l'opacité : c'est précisément la panne qu'on
    // cherche ici, une page entièrement transparente faute de révélation.
    await expect(title).toHaveCSS("opacity", "1");
  });

  test("une section basse se révèle quand on arrive dessus", async ({ page }) => {
    await page.goto("/");

    // La première question de la FAQ : assez bas dans la page pour être encore
    // à l'état de départ au chargement, et enveloppée dans son propre conteneur
    // de révélation.
    const wrapper = page.locator('[data-reveal]').filter({ has: page.locator("details") }).first();
    await expect(wrapper).toHaveAttribute("data-reveal", "pending");

    await wrapper.scrollIntoViewIfNeeded();
    await expect(wrapper).toHaveAttribute("data-reveal", "in");
    await expect(wrapper).toHaveCSS("opacity", "1");
  });

  test("la FAQ s'ouvre et annonce son état", async ({ page }) => {
    await page.goto("/");
    const first = page.locator("details").first();
    await expect(first).not.toHaveAttribute("open", "");
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
  });

  test("les deux actions du héros sont là, et l'invitation est reprise en bas", async ({ page }) => {
    await page.goto("/");
    // Deux fois la même invitation, à dessein : une fois en ouverture, une fois
    // en refermant la page. D'où le `.first()` — l'ambiguïté est le comportement
    // voulu, pas un défaut à corriger.
    const inscription = page.getByRole("link", { name: "Créer un compte coach" });
    await expect(inscription).toHaveCount(2);
    await expect(inscription.first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir les annonces" })).toBeVisible();
  });

  test("un seul h1, et les niveaux de titre ne sautent pas", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3")].map((h) => Number(h.tagName[1])),
    );
    for (let i = 1; i < levels.length; i++) {
      // On peut redescendre de n'importe où, mais jamais monter de plus d'un
      // cran : un h3 qui suit un h1 laisse un trou dans le plan du document.
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });
});

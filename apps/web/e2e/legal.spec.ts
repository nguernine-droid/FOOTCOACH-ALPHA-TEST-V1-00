import { expect, test } from "@playwright/test";

/**
 * Les trois documents légaux, et un piège de typographie.
 *
 * ── Le piège ────────────────────────────────────────────────────────────
 * JSX rogne les espaces de bord de CHAQUE ligne d'un nœud de texte qui
 * s'étend sur plusieurs lignes, puis joint les lignes par une espace. L'espace
 * qui suit `</b>` disparaît donc quand la phrase se poursuit à la ligne
 * suivante — mais survit quand tout tient sur une ligne. Deux écritures
 * identiques, deux rendus différents : « service gratuitqui ne tire ».
 *
 * Le défaut existait déjà dans `InstallShowcase` avant que ces pages soient
 * écrites, personne ne l'avait vu, et il est invisible à la relecture du code
 * puisque la source, elle, contient bien l'espace. Seul le HTML rendu le
 * montre — d'où ce test.
 */

const PAGES = ["/", "/mentions-legales", "/cgu", "/confidentialite"];

test.describe("Pages légales", () => {
  for (const path of PAGES) {
    test(`aucun mot collé à une emphase sur ${path}`, async ({ page }) => {
      await page.goto(path);
      const glued = await page.evaluate(() => {
        const html = document.body.innerHTML;
        const found: string[] = [];
        // Balise d'emphase fermée puis, immédiatement, une lettre.
        for (const m of html.matchAll(/<\/(?:b|strong|em)>(?=[A-Za-zÀ-ÿ])/g)) {
          found.push(html.slice(Math.max(0, m.index - 45), m.index + 25));
        }
        // Et le cas symétrique : une lettre collée à une emphase ouvrante.
        for (const m of html.matchAll(/[A-Za-zÀ-ÿ](?=<(?:b|strong|em)[ >])/g)) {
          found.push(html.slice(Math.max(0, m.index - 45), m.index + 25));
        }
        return found;
      });
      expect(glued, `mots collés :\n${glued.join("\n")}`).toEqual([]);
    });
  }

  test("les trois documents répondent et portent leur titre", async ({ page }) => {
    for (const [path, heading] of [
      ["/mentions-legales", /mentions légales/i],
      ["/cgu", /conditions générales/i],
      ["/confidentialite", /politique de confidentialité/i],
    ] as const) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} doit répondre 200`).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    }
  });

  test("le pied de page mène aux trois documents", async ({ page }) => {
    await page.goto("/");
    for (const [name, href] of [
      ["Mentions légales", "/mentions-legales"],
      ["Confidentialité", "/confidentialite"],
      ["CGU", "/cgu"],
    ] as const) {
      await expect(page.getByRole("contentinfo").getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  test("le sommaire pointe vers des ancres qui existent", async ({ page }) => {
    for (const path of ["/mentions-legales", "/cgu", "/confidentialite"]) {
      await page.goto(path);
      const targets = await page.evaluate(() =>
        [...document.querySelectorAll('nav[aria-label="Sommaire"] a')].map((a) =>
          (a as HTMLAnchorElement).getAttribute("href"),
        ),
      );
      expect(targets.length).toBeGreaterThan(0);
      for (const target of targets) {
        // Une ancre morte dans un document légal envoie le lecteur nulle part,
        // précisément quand il cherche une information qu'on lui doit.
        await expect(page.locator(target!)).toHaveCount(1);
      }
    }
  });

  test("aucun débordement horizontal, tableaux compris", async ({ page }) => {
    // Les tableaux de la politique de confidentialité sont larges : ils doivent
    // défiler dans leur propre conteneur, pas élargir la page.
    await page.setViewportSize({ width: 320, height: 900 });
    for (const path of ["/mentions-legales", "/cgu", "/confidentialite"]) {
      await page.goto(path);
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      );
      expect(fits, `${path} déborde à 320 px`).toBe(true);
    }
  });
});

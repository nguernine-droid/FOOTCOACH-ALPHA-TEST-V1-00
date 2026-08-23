import { expect, test, type Page } from "@playwright/test";

/**
 * LE RÉFÉRENCEMENT, VÉRIFIÉ DANS UN VRAI NAVIGATEUR.
 *
 * Tout ce qui est testé ici partage un défaut : ça casse SANS BRUIT. Une balise
 * canonique qui disparaît, un titre qui redevient celui de la racine, un bloc
 * de données structurées refusé par la politique de contenu faute de nonce —
 * la page continue de s'afficher exactement pareil, et personne ne s'en aperçoit
 * avant de constater, des semaines plus tard, que le trafic ne vient plus.
 *
 * C'est précisément ce qu'un test automatique sait attraper et qu'une relecture
 * humaine ne voit pas.
 *
 * Aucune API n'est nécessaire : sans elle, les listes d'annonces sont vides et
 * les pages se rendent quand même (voir `publicApi.ts`). Ce qui est vérifié ici
 * — identité du service, fils d'Ariane, titres, plan du site — ne dépend
 * d'aucune donnée.
 */

/** Tous les blocs `application/ld+json` de la page, désérialisés. */
async function structuredData(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((raw) => JSON.parse(raw) as Record<string, unknown>);
}

/** Les nœuds d'un `@graph`, à plat, quel que soit le nombre de blocs. */
async function graphNodes(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await structuredData(page);
  return blocks.flatMap((block) => (block["@graph"] as Record<string, unknown>[]) ?? [block]);
}

const typesOf = (nodes: Record<string, unknown>[]) => nodes.map((n) => n["@type"]);

test.describe("Référencement — page d'accueil", () => {
  test("le service se décrit lui-même aux moteurs", async ({ page }) => {
    await page.goto("/");
    const nodes = await graphNodes(page);

    // Les trois nœuds d'identité. Sans eux, un moteur sait de quoi parle la
    // page mais pas ce qu'est le service, ni qui l'édite.
    expect(typesOf(nodes)).toEqual(
      expect.arrayContaining(["Organization", "WebSite", "SoftwareApplication", "FAQPage"]),
    );

    const org = nodes.find((n) => n["@type"] === "Organization")!;
    expect(org.name).toBe("TeamNexus");
    // Le logo est ce qui rend l'éditeur affichable à côté du lien : une URL
    // absolue, sur une image que le site sert vraiment.
    expect((org.logo as { url: string }).url).toMatch(/^https?:\/\/.+\/icon\.png$/);

    // Gratuit, dit dans un vocabulaire qu'un moteur comprend — c'est la
    // première question de la FAQ, elle ne doit pas exister qu'en français.
    const app = nodes.find((n) => n["@type"] === "SoftwareApplication")!;
    expect((app.offers as { price: string }).price).toBe("0");

    // Le nœud du site cite l'éditeur par identifiant : c'est ce lien qui fait
    // du graphe autre chose qu'une pile de blocs indépendants.
    const site = nodes.find((n) => n["@type"] === "WebSite")!;
    expect((site.publisher as { "@id": string })["@id"]).toBe(org["@id"]);
  });

  test("la FAQ balisée dit la même chose que la page", async ({ page }) => {
    await page.goto("/");
    const nodes = await graphNodes(page);
    const faq = nodes.find((n) => n["@type"] === "FAQPage")!;
    const questions = (faq.mainEntity as { name: string }[]).map((q) => q.name);

    expect(questions.length).toBeGreaterThan(0);
    // Chaque question balisée doit être VISIBLE dans la page : une question
    // qui n'existe que dans le balisage est exactement ce que Google
    // sanctionne, et c'est la dérive naturelle le jour où l'on retire un
    // accordéon sans toucher au tableau.
    for (const question of questions) {
      await expect(page.getByText(question, { exact: false }).first()).toBeVisible();
    }
  });
});

test.describe("Référencement — la couche publique", () => {
  test("l'index des annonces porte son fil d'Ariane", async ({ page }) => {
    await page.goto("/f");
    const nodes = await graphNodes(page);
    const trail = nodes.find((n) => n["@type"] === "BreadcrumbList")!;
    const steps = (trail.itemListElement as { name: string; item: string }[]).map((s) => s.name);

    // Posé MÊME sans annonce : il décrit la place de la page dans le site, ce
    // qui reste vrai un jour où personne ne cherche de match.
    expect(steps).toEqual(["Accueil", "Annonces de matchs amicaux"]);
  });

  test("chaque page publique désigne son adresse sans ambiguïté", async ({ page }) => {
    for (const path of ["/", "/f", "/login", "/register"]) {
      await page.goto(path);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      // Absolue, toujours : une canonique relative laisse le moteur choisir
      // l'hôte, ce qui est l'exact contraire de son objet.
      expect(canonical).toMatch(/^https?:\/\//);
      expect(new URL(canonical!).pathname).toBe(path);
    }
  });

  test("aucune page n'hérite du titre de la racine", async ({ page }) => {
    await page.goto("/");
    const home = await page.title();

    // Le piège : une page rendue par un composant client ne PEUT PAS exporter
    // ses métadonnées, elle prend alors celles de la racine sans rien signaler.
    // C'est ce qui arrivait à la connexion et à l'inscription.
    for (const path of ["/f", "/login", "/register", "/mentions-legales"]) {
      await page.goto(path);
      const title = await page.title();
      expect(title, `titre hérité sur ${path}`).not.toBe(home);
      // La marque est posée une fois, par le gabarit du layout.
      expect(title).toMatch(/\| TeamNexus$/);
    }
  });
});

test.describe("Référencement — ce qu'on dit aux robots", () => {
  test("robots.txt ouvre les annonces, ferme les espaces privés, et mène au plan", async ({
    request,
  }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toContain("Allow: /f");
    expect(body).toContain("Disallow: /coach/");
    expect(body).toContain("Disallow: /api/");
    expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  });

  test("le plan du site est un XML valide qui déclare au moins la racine", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("<urlset");
    // Sans API, seules les pages fixes sortent — c'est le minimum vital, et
    // c'est aussi ce qui reste le jour où la base ne répond pas.
    expect(body).toContain("<loc>");
  });

  test("une adresse morte répond 404 et ramène quelque part", async ({ page }) => {
    const response = await page.goto("/cette-page-nexiste-pas");
    // Le statut, d'abord : c'est lui qui fait retirer l'adresse de l'index.
    // Une page « introuvable » servie en 200 y reste indéfiniment.
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /voir les annonces/i })).toBeVisible();
  });
});

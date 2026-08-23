import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Barlow_Condensed, Inter } from "next/font/google";
import { InstallPromptListener } from "@/components/InstallPromptListener";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { siteUrl } from "@/lib/publicApi";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  /**
   * Base des URL relatives des métadonnées. Sans elle, le `canonical` des pages
   * publiques sort relatif (« /f/rhone-69 ») : les moteurs l'acceptent, mais
   * une balise canonique n'a d'intérêt que si elle désigne SANS AMBIGUÏTÉ une
   * adresse — c'est tout son objet.
   */
  metadataBase: new URL(siteUrl()),
  /**
   * Le titre des pages : un gabarit, pas une valeur.
   *
   * Chaque page publique portait sa marque à la main, avec un séparateur
   * différent d'une page à l'autre (« | » sur les annonces, « — » sur les
   * pages légales). Le gabarit la pose une fois : les pages n'écrivent plus
   * que leur sujet, et celle qui oublie son titre hérite du `default` plutôt
   * que du nom brut du service.
   */
  title: {
    default: "TeamNexus — trouvez un adversaire pour votre prochain match amical",
    template: "%s | TeamNexus",
  },
  description:
    "L'application gratuite des coachs de football amateur : publiez vos dates libres, trouvez un adversaire près de chez vous et organisez le match amical.",
  applicationName: "TeamNexus",
  // Installée sur l'écran d'accueil iOS, l'app s'ouvre sans barre Safari
  appleWebApp: { capable: true, title: "TeamNexus", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  /**
   * Aperçu des liens partagés.
   *
   * Ce n'est pas de la décoration : le bouche-à-oreille du foot amateur passe
   * par des groupes WhatsApp, et un lien sans titre ni image y ressemble à du
   * spam. Défini une fois ici, chaque page publique n'a plus qu'à surcharger
   * son titre et sa description — le reste (image, locale, nom du site) est
   * hérité.
   */
  openGraph: {
    type: "website",
    siteName: "TeamNexus",
    locale: "fr_FR",
    title: "TeamNexus — trouvez un adversaire pour votre prochain match amical",
    description:
      "L'application des coachs de football amateur pour organiser leurs matchs amicaux. Gratuit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TeamNexus — matchs amicaux de football",
    description:
      "Déclarez vos dates libres, les équipes libres en face vous sont proposées.",
  },
  /**
   * Preuve de propriété du domaine pour la Search Console de Google.
   *
   * Déclarée ici plutôt qu'écrite à la main dans le `<head>` : Next pose la
   * balise lui-même, et le `<head>` de ce fichier est réservé au script
   * anti-flash, seul élément qui doive précéder le premier rendu.
   *
   * Ce jeton n'est pas un secret — il est PUBLIÉ dans le HTML de chaque page,
   * c'est tout son objet. Il ne donne aucun accès : il atteste seulement que
   * celui qui l'a posé dispose du domaine.
   */
  verification: { google: "wfrnwQhpbCXgvoyIozQR06Su_X40cKgeqM1eh88wXPQ" },
  /**
   * Ce qu'un moteur a le droit de FAIRE des pages qu'il lit — à distinguer de
   * `robots.ts`, qui dit seulement lesquelles il a le droit de lire.
   *
   * Par défaut, Google se limite à un extrait court et à une vignette
   * minuscule. Les trois directives ci-dessous lèvent ces limites : un extrait
   * de la longueur qu'il juge utile, et surtout une image d'aperçu en GRAND
   * format. C'est ce qui décide de la taille de la vignette dans les résultats
   * et de l'éligibilité à Google Discover — sur un service qui se partage entre
   * coachs, un lien qui montre son image se clique, un lien nu se saute.
   *
   * Les espaces privés ne sont pas concernés : `robots.ts` leur interdit
   * l'accès, et une directive posée sur une page qu'on ne crawle pas ne se lit
   * jamais.
   */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sans `cover`, les env(safe-area-inset-*) valent toujours 0 : la barre
  // d'onglets basse ne saurait pas s'écarter de la barre d'accueil iOS.
  viewportFit: "cover",
  // `themeColor` n'est volontairement pas déclaré ici : la balise est posée
  // par le script d'amorçage puis tenue à jour par `applyTheme`. Une balise
  // statique rendue par Next se placerait avant et gagnerait la partie.
  // Le zoom système reste autorisé (accessibilité) : pas de maximumScale.
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Jeton posé par le middleware, propre à cette requête. Le lire rend le rendu
  // dynamique — ce qui serait de toute façon le cas : une page mise en cache
  // servirait un nonce périmé, et ses scripts seraient refusés.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* ANTI-FLASH. Ce script est bloquant et placé avant tout le reste : il
            lit le choix mémorisé et pose `data-theme` sur <html> avant le
            premier rendu. Sans lui, un coach en thème sombre verrait l'écran
            blanc le temps que React démarre — à chaque chargement de page.

            Il porte le nonce de la requête : c'est le seul script en ligne que
            nous écrivons, et la politique de contenu n'autorise que ceux-là.

            `suppressHydrationWarning` sur <html> parce que l'attribut que ce
            script ajoute n'existe pas dans le HTML rendu par le serveur.

            Et sur le <script> lui-même pour une autre raison : après avoir lu
            la page, le navigateur VIDE l'attribut `nonce` — c'est une défense
            contre son exfiltration par un sélecteur CSS. Le client lit donc
            une chaîne vide là où le serveur avait écrit le jeton, et React y
            voit une divergence. Le nonce, lui, reste dans la propriété DOM :
            le script s'exécute normalement, il n'y a rien à réparer. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className="antialiased">
        <InstallPromptListener />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Barlow_Condensed, Inter } from "next/font/google";
import { InstallPromptListener } from "@/components/InstallPromptListener";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
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
  title: "FOOTCOACH",
  description: "Gestion de matchs amicaux — coachs, joueurs, parents et supporters",
  applicationName: "FootCoach",
  // Installée sur l'écran d'accueil iOS, l'app s'ouvre sans barre Safari
  appleWebApp: { capable: true, title: "FootCoach", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
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

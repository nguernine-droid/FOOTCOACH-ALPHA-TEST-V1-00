import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* ANTI-FLASH. Ce script est bloquant et placé avant tout le reste : il
            lit le choix mémorisé et pose `data-theme` sur <html> avant le
            premier rendu. Sans lui, un coach en thème sombre verrait l'écran
            blanc le temps que React démarre — à chaque chargement de page.
            `suppressHydrationWarning` sur <html> parce que l'attribut qu'il
            ajoute n'existe pas dans le HTML rendu par le serveur. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

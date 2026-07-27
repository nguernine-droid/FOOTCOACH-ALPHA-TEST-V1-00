import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
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
  // Teinte la barre du navigateur dans la continuité du header navy
  themeColor: "#071B3F",
  // Le zoom système reste autorisé (accessibilité) : pas de maximumScale.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

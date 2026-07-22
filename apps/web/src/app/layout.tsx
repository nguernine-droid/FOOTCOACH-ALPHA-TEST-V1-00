import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "FOOTCOACH",
  description: "Gestion de matchs amicaux — coachs, joueurs, parents et supporters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={display.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

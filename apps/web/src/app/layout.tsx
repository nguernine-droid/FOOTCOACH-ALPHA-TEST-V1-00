import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOOTCOACH",
  description: "Gestion de matchs amicaux — coachs, joueurs, parents et supporters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}

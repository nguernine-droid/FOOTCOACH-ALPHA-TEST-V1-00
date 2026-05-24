import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { VersionGuard } from "@/components/VersionGuard";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { ClientGuard } from "@/components/ClientGuard";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ScanlinesOverlay } from "@/components/ui/cyber/ScanlinesOverlay";
import { TeamProvider } from "@/lib/context/TeamContext";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "TEAM NEXUS ALPHA V1",
  description: "Unité Tactique de Matchmaking & Coaching",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TEAM NEXUS",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
    icon: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("font-sans", geist.variable)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#F97316" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FOOTCOACH" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="https://nextjs.org/favicon.ico" />
        <link rel="apple-touch-icon" href="https://nextjs.org/favicon.ico" />
        <link rel="mask-icon" href="https://nextjs.org/favicon.ico" color="#F97316" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased bg-black min-h-screen">
        <TeamProvider>
          <VersionGuard>
            <ClientGuard>
              <ScanlinesOverlay />
              <PWAInstallPrompt />
              {children}
            </ClientGuard>
          </VersionGuard>
        </TeamProvider>
      </body>
    </html>
  );
}

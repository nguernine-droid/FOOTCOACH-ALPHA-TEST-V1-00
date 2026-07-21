import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { VersionGuard } from "@/components/VersionGuard";
import { ClientGuard } from "@/components/ClientGuard";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TeamProvider } from "@/lib/context/TeamContext";
import { MotionConfig } from "framer-motion";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "FOOTCOACH — TEAM NEXUS",
  description: "Unité Tactique de Matchmaking & Coaching",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FOOTCOACH",
  },
  icons: {
    apple: "/icons/icon.svg",
    icon: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
  // Zoom autorisé (WCAG 1.4.4) — ne pas remettre maximumScale/userScalable.
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
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <link rel="mask-icon" href="/icons/icon.svg" color="#F97316" />
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
      <body className="antialiased bg-[#15171C] min-h-screen">
        <MotionConfig reducedMotion="user">
          <TeamProvider>
            <VersionGuard>
              <ClientGuard>
                <PWAInstallPrompt />
                {children}
              </ClientGuard>
            </VersionGuard>
          </TeamProvider>
        </MotionConfig>
      </body>
    </html>
  );
}

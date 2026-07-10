// Hôte Supabase autorisé pour les connexions (REST + Realtime WebSocket).
const SUPABASE_HOST = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^https?:\/\//, '');
const CONNECT_SRC = ["'self'"]
  .concat(SUPABASE_HOST ? [`https://${SUPABASE_HOST}`, `wss://${SUPABASE_HOST}`] : ['https://*.supabase.co', 'wss://*.supabase.co']);

const CSP = [
  "default-src 'self'",
  // Next.js injecte des scripts inline (bootstrap, enregistrement du service worker) → 'unsafe-inline'.
  "script-src 'self' 'unsafe-inline'",
  // Tailwind / styles inline → 'unsafe-inline'.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://api.dicebear.com",
  "font-src 'self' data:",
  `connect-src ${CONNECT_SRC.join(' ')}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimisations PWA
  reactStrictMode: true,
  compress: true,

  // Optimisations d'images
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    // ✅ AJOUT : Autorisation des avatars externes DiceBear
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },

  // Headers pour meilleure performance PWA
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, must-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@footcoach/shared"],
  // La version du serveur n'apprend rien d'utile à un visiteur légitime
  poweredByHeader: false,

  /**
   * L'application n'utilise pas `next/image` : les photos de profil sont
   * servies telles quelles par l'API, dans une balise `img`. L'endpoint
   * d'optimisation restait pourtant ouvert, et il traite l'image demandée avec
   * sharp — soit, en pratique, une image téléversée par un utilisateur.
   * Le désactiver retire une surface d'attaque dont personne ne se sert.
   */
  images: { unoptimized: true },

  /**
   * En-têtes de sécurité de l'application servie au navigateur.
   *
   * La politique de contenu autorise `unsafe-inline` sur les styles : Next et
   * Tailwind injectent des styles en ligne au rendu. Les SCRIPTS, eux, ne
   * viennent que de l'origine — c'est ce qui compte contre l'injection de code.
   * Les images acceptent `data:` et `blob:` pour l'aperçu de photo de profil et
   * le rendu des QR codes sur canvas.
   */
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "media-src 'self' blob:",
      "worker-src 'self'",
      "manifest-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          // La caméra sert au scan du QR code ; le reste est refusé d'office.
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
  async rewrites() {
    // Le navigateur ne parle qu'au service web ; l'API est proxifiée en interne.
    // Avec plusieurs réplicas api, le DNS Docker fait la répartition.
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL ?? "http://localhost:4000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;

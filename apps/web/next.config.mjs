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
   * En-têtes de sécurité fixes, posés sur toutes les réponses.
   *
   * La politique de contenu n'est PAS ici : elle contient un nonce qui change
   * à chaque requête, elle vit donc dans `src/proxy.ts`. Deux politiques
   * simultanées s'appliqueraient par intersection — plus difficile à raisonner
   * qu'une seule, pour aucun gain.
   */
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          // La caméra sert au scan du QR code ; le reste est refusé d'office.
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
          ...(isDev
            ? []
            : [{ key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" }]),
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

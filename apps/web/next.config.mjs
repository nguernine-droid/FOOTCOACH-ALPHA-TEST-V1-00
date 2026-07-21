/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@footcoach/shared"],
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

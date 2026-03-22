/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
      {
        protocol: "https",
        hostname: "default-avatar.com",
      },
    ],
  },
  experimental: {
    /** Publicações com imagem em base64 no JSON */
    serverActions: {
      bodySizeLimit: "8mb",
    },
    proxyClientMaxBodySize: "8mb",
  },
};

module.exports = nextConfig;

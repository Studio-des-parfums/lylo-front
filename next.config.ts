import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      // Images publiques Lylo sur Cloudflare R2 (bucket lylo).
      {
        protocol: "https",
        hostname: "files.lylo-ai.com",
      },
    ],
  },
};

export default nextConfig;

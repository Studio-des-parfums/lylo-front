import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lylo-back-production-78a9.up.railway.app",
        pathname: "/files/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/files/**",
      },
    ],
  },
};

export default nextConfig;

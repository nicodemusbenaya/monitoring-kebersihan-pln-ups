import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    "/**": [
      "./prisma/dev.db",
      "./prisma/seed_data.json",
      "./Ceklis Ruangan UPS (1).xlsx",
      "./Ceklis Ruangan UPS (3).xlsx",
      "./public/templates/**/*",
    ],
  },
  typescript: {
    // Allow production builds to successfully complete even with type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/checklist/:token",
        destination: "/scanner/room/:token",
        permanent: true,
      },
      {
        source: "/evaluasi/:token",
        destination: "/evaluate/:token",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

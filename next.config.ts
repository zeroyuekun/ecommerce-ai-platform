import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.listonce.com.au",
      },
      {
        protocol: "https",
        hostname: "content.api.news",
      },
      {
        protocol: "https",
        hostname: "cdn.decorilla.com",
      },
      {
        protocol: "https",
        hostname: "www.decorilla.com",
      },
      {
        protocol: "https",
        hostname: "cdn-bnokp.nitrocdn.com",
      },
    ],
  },
};

export default nextConfig;

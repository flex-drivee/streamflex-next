import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "peach.blender.org", // For your demo videos
      },
      {
        protocol: "https",
        hostname: "commondatastorage.googleapis.com", // For demo videos
      },
       {
        protocol: "https",
        hostname: "mango.blender.org", // For demo videos
      },
    ],
  },
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "warpcast.com",
        port: "",
        pathname: "/og-logo.png",
      },
    ],
  },
};

export default nextConfig;

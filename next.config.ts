import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure environment variables
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;

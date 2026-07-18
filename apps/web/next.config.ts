import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@genesis-sentinel/shared"],
  experimental: {
    staleTimes: { dynamic: 30, static: 180 }
  }
};

export default nextConfig;

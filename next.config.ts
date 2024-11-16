import type { NextConfig } from "next";
import "reflect-metadata";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    forceSwcTransforms: true,
  }
};

export default nextConfig;

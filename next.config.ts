import type { NextConfig } from "next";
import "reflect-metadata";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    forceSwcTransforms: true,
  },
};

export default nextConfig;

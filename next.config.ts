import type { NextConfig } from 'next';
import 'reflect-metadata';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    forceSwcTransforms: true,
  },
};

export default nextConfig;

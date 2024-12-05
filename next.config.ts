import type { NextConfig } from 'next';
import 'reflect-metadata';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    forceSwcTransforms: true,
  },
  serverExternalPackages: ['re2'],
};

export default nextConfig;

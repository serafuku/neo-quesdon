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
  headers: async () => {
    return [
      { source: '/static/:slug*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31234567, immutable' }] },
    ];
  },
};

export default nextConfig;

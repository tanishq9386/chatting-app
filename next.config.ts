import type { NextConfig } from 'next';
import type { WebpackConfigContext } from 'next/dist/server/config-shared';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {},
  },
  // Ensure compatibility with Socket.io
  webpack: (config: any, { isServer }: WebpackConfigContext) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;

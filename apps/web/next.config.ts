import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@rankvibe/core', '@rankvibe/db', '@rankvibe/ui'],
};

export default nextConfig;

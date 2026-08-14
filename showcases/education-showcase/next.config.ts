import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Empty for local development; '/showcase' in the monolith deployment,
  // where the showcase shares the marketplace domain under that prefix.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
};

export default nextConfig;

import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see apps/web/Dockerfile).
  output: 'standalone',
  // Monorepo: trace dependencies from the repository root.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
};

export default nextConfig;

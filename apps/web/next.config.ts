import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see apps/web/Dockerfile).
  output: 'standalone',
  // Monorepo: trace dependencies from the repository root.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
};

export default withNextIntl(nextConfig);

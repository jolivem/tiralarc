import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see apps/web/Dockerfile).
  output: 'standalone',
  // Monorepo: trace dependencies from the repository root.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // The dev "N" badge sits in a screen corner, over the phone tab bar / header controls.
  // Compile and runtime errors are still reported.
  devIndicators: false,
  experimental: {
    // Photo uploads (10 MB max, checked by the API) go through a Server Action, hence through
    // proxy.ts: both default limits (1 MB and 10 MB) are below a full-size upload.
    serverActions: { bodySizeLimit: '12mb' },
    proxyClientMaxBodySize: '12mb',
  },
};

export default withNextIntl(nextConfig);

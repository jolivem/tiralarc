import { defineConfig } from 'vitest/config';

/**
 * The site's end-to-end journeys (`e2e/`), played in a real browser (Playwright's Chromium,
 * through playwright-core) against the running app: `pnpm dev` (web, API, MariaDB, Mailpit)
 * must be up. `pnpm --filter @tiralarc/web test:e2e`.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['e2e/**/*.e2e.ts'],
    // One browser, journeys one after the other: they share the dev database.
    fileParallelism: false,
    testTimeout: 90_000,
    hookTimeout: 60_000,
  },
});

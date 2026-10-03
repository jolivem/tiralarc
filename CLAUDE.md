# Tiralarc

pnpm + Turborepo monorepo: `apps/api` (NestJS 12, ESM, Prisma 7 + MariaDB), `apps/web` (Next.js 16),
`packages/api-client` (generated from `apps/api/openapi.json`). Future Android/iOS apps will consume
the same API — keep it client-agnostic (no cookies, no web-only assumptions in the API).

## Commands

- `pnpm db:up` — MariaDB on localhost:3307 (databases `tiralarc`, `tiralarc_test`, `tiralarc_shadow`)
- `pnpm dev` / `pnpm turbo run lint typecheck test build`
- `pnpm --filter @tiralarc/api test:e2e` — needs MariaDB running
- `pnpm openapi` — after any API contract change; commit `openapi.json` and `packages/api-client/src/schema.ts`
- `pnpm --filter @tiralarc/api db:migrate` — after editing `prisma/schema.prisma`

## Conventions

- API: ESM, relative imports end in `.js`. Routes are `/api/v1/...`, authenticated by default
  (global `AuthGuard`), `@Public()` to opt out. Errors go through `ProblemDetailsFilter`.
  Document DTOs with `@ApiProperty` — the OpenAPI document is the contract for mobile clients.
- Global HTTP setup lives in `apps/api/src/setup.ts` (shared by main, e2e tests and OpenAPI export).
- Tests use Vitest; the API lints with oxlint, the rest with ESLint.
- Web: tokens only server-side (httpOnly cookies, `src/lib/session.ts`); use `src/lib/api.ts` from
  Server Components / Actions. Next.js 16: middleware is `src/proxy.ts`; read `apps/web/AGENTS.md`.
- TypeScript is pinned to 6.0 (TS 7 is not yet supported by typescript-eslint / tooling).

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
- Errors: throw `ApiException(status, ErrorCode.X, detail)`; codes in `apps/api/src/common/errors.ts`
  are public contract (mirrored in `packages/api-client/src/index.ts`) — clients translate them.
- Roles: `ARCHER`/`COACH` self-assigned, `ADMIN` via `user:make-admin`; guard with `@Roles(...)`.
- Web is bilingual (next-intl, `/fr`, `/en`): every user-facing string goes in `apps/web/messages/{fr,en}.json`;
  use `Link`/`redirect` from `@/i18n/navigation`, not `next/link`/`next/navigation`.
- UI: Mantine 9 (no Tailwind). Responsive via Mantine props (`cols={{ base: 1, sm: 2 }}`, `hiddenFrom`,
  `visibleFrom`; sm = 768px tablet). In Server Components use `ButtonLink` / `AnchorLink`
  (`src/components/links.tsx`), never `component={Link}`. Icons: `@tabler/icons-react`.
- Signed-in user in Server Components: `getCurrentUser()` (`src/lib/current-user.ts`, one `/users/me` per request).
  Archer pages live under `src/app/[locale]/archer/`, guarded by its layout (ARCHER role); add new sections to
  `sections` in `src/components/app-shell.tsx` (side menu + phone tab bar).
- Journals: a `Journal` is a named period (title + inclusive start / end days), usually one season. There is no
  link to events: a journal's events are the archer's sessions dated within its period. An archer's journals must
  not overlap (`JOURNAL_OVERLAP`, checked by the API, not the database); deleting a journal keeps its events. The
  selected journal is a web-only preference (`tl_journal` cookie, `src/lib/journals.ts`).
- Calendar decoration themes: a journal stores one theme id per month (`monthThemes`, set from the Journal
  page); the web catalogue is `components/journal/themes.ts`,
  artwork in `apps/web/public/themes/<id>/` (`top`, optional `bottom` / `left` / `right`, `thumb`; black line art on
  white). Adding a theme = image folder + catalogue entry + `journals.themes.<id>` in both message files.
- Colouring the decoration: `monthThemes[].fills` holds "paint bucket" clicks (band, x, y as fractions, colour);
  the web repaints them on a canvas (`components/journal/coloring.ts`, pure and unit-tested, + `calendar-frame.tsx`).
  Flood fill stops at dark strokes, so artwork needs closed shapes; changing a month's theme clears its colouring.
- Indicators (`/archer/stats`): `GET /journal/sessions/stats?from&to` (both optional = all time) returns raw figures; the web draws them with
  `@mantine/charts` (`components/stats/`). Chart colours are CSS variables in `stats.module.css` (light + dark sets
  checked for colour-blind separation); a discipline keeps its colour slot (`disciplineColor`).
- Event photos: files go to S3-compatible storage through `StorageService` (`apps/api/src/storage/`, a local
  Versity Gateway on :9000 in dev, an in-memory fake in e2e tests); the DB keeps one `SessionPhoto` row. Uploads are
  re-encoded with `sharp` (2000 px + thumbnail, metadata dropped) and read back through 10-minute signed URLs.
  Deleting an event or a journal must also remove the files (`PhotosService.removeFiles`).
- Archer profile (`apps/api/src/profile/`, web `components/profile/`): sport details, favourite websites and people
  invited by email. Accepting an invitation (public `/invitations/accept`, token consumed on POST) grants no access yet.
- `@mantine/schedule` 9.6.3 leaks some props to the DOM from MonthView / YearView: don't pass `mode="static"`,
  and pass `onTimeSlotClick` / `onAllDaySlotClick` only in day / week views (see `components/journal/journal-view.tsx`).
- Mantine `Slider`: accessible name goes in `thumbLabel`, not `aria-label`.
- `pnpm openapi` compiles to `apps/api/dist-openapi/`, safe while `pnpm dev` runs; `pnpm build` is not (it rewrites `apps/api/dist`).
- Forms posting to Server Actions: keep user input in React state (controlled inputs) — React resets
  uncontrolled fields after each submission, even when the server rejects it.
- Dev emails land in Mailpit (http://localhost:8025). e2e tests capture mail and fake ID tokens (`apps/api/test/helpers.ts`).
- TypeScript is pinned to 6.0 (TS 7 is not yet supported by typescript-eslint / tooling).

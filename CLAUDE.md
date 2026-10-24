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
- Roles: nobody picks them (no roles at sign-up, no onboarding, the Account page only shows them). Every account
  is `ARCHER` (stored at creation); `COACH` is not stored but derived while an accepted coach invitation exists
  (`rolesOf` in `apps/api/src/users/roles.ts`, used by `/users/me` and the access token); `ADMIN` via
  `user:make-admin`. Guard with `@Roles(...)`. Web: no profile to pick at sign-in — the journal opened in the
  header's journal menu (`components/journal-menu.tsx`: own journals, then coached archers') sets the web-only
  `tl_profile` cookie (`src/lib/current-user-paths.ts`), which only decides where the logo leads (`/archer` or
  `/coach`). The archer area needs the ARCHER role; the tabs follow the URL (`/archer/…` or `/coach/<archerId>/…`).
- Coaching (`apps/api/src/coaching/`, routes `/coach/athletes/...`, no `@Roles`: access comes from the link): an
  archer invites their coach from the Profile page (`isCoach` + `coachAccess` READ / WRITE, changeable via PATCH).
  The coach accepts while signed in (`SIGN_IN_REQUIRED` otherwise; `POST /invitations/accept` is public but reads
  an optional bearer token, `OptionalUser`) and is linked (`ProfileInvitation.coachId`). They see only the journal
  whose period covers today (calendar, sheets, photos, indicators, goals); WRITE also plans TRAINING / COACHING /
  COMPETITION / STRENGTH events after today (planning fields only, `DATE_NOT_PLANNABLE`), stored with
  `plannedById`; they may change / delete only the ones they planned, while still to come. Such an event is
  "new" to the archer until they open its sheet (`seenAt`, set by `POST /journal/sessions/{id}/seen`, called by
  `SessionForm` once shown — not by the GET), listed on the home page (`GET /journal/sessions/new`,
  `components/journal/new-events.tsx`); calendars and the sheet's margin show a "Coach" stamp until it is completed. Web: the list of
  archers is a card of the Account page (`components/coach/athletes-card.tsx`, where the coach profile's logo
  leads), then `/coach/[archerId]/{journal,journal/[id],stats}` reusing `JournalView` / `SessionForm` (`coach` prop) and
  read-only `SessionPhotos` / `GoalsCard`. Deleting the invitation ends the access.
- Web is bilingual (next-intl, `/fr`, `/en`): every user-facing string goes in `apps/web/messages/{fr,en}.json`;
  use `Link`/`redirect` from `@/i18n/navigation`, not `next/link`/`next/navigation`.
- UI: Mantine 9 (no Tailwind). Responsive via Mantine props (`cols={{ base: 1, sm: 2 }}`, `hiddenFrom`,
  `visibleFrom`; sm = 768px tablet). In Server Components use `ButtonLink` / `AnchorLink`
  (`src/components/links.tsx`), never `component={Link}`. Icons: `@tabler/icons-react`.
- Signed-in user in Server Components: `getCurrentUser()` (`src/lib/current-user.ts`, one `/users/me` per request).
  Archer pages live under `src/app/[locale]/archer/`, guarded by its layout (ARCHER role); add new sections to
  `ARCHER_SECTIONS` in `src/components/sections.ts` (each keeps one colour: divider tab + home sticky note).
- Archer look: a diary on a desk. From tablets up the archer layout's grid puts binder divider tabs
  (`components/binder/`, vertical labels) left of the page content; phones get tabs along the bottom (app-shell).
  A page's direct child with `binder.header` sits above, the tabs then start level with the content.
  The home page is an open notebook (`components/notebook/`: two ruled pages, stacked below md); the other
  sections use `SectionPage`, which puts the title above the same notebook (two pages via `left`/`right`, or one
  wide page via `children` for content the fold would cut: calendar, charts). Fonts:
  `--font-hand` (Caveat, headings) and `--font-calendar` (the calendars' weekdays and day numbers: one of five
  calligraphy fonts, `src/lib/calendar-fonts.ts`, chosen on the Profile page — `calendarFont` in the API's archer
  profile — and set on `<html>` by the root layout; `--font-hand-upright`, Patrick Hand, as fallback). On the
  archer home page every title and the date use that font, in bold (`archer/home.module.css` points `--font-hand`
  to `--font-calendar`). The selected
  journal's title is centred in the header.
- Journals: a `Journal` is a named period (title + inclusive start / end days), usually one season. There is no
  link to events: a journal's events are the archer's sessions dated within its period. An archer's journals must
  not overlap (`JOURNAL_OVERLAP`, checked by the API, not the database); deleting a journal keeps its events. The
  selected journal is a web-only preference (`tl_journal` cookie, `src/lib/journals.ts`), cleared at sign-in so the
  archer's default journal (`isDefault`, starred on the Account page, one per archer, set via PATCH) opens first.
- Calendar decoration themes: a journal stores one theme id per month (`monthThemes`, set from the Journal
  page); the web catalogue is `components/journal/themes.ts`,
  artwork in `apps/web/public/themes/<id>/` (`top`, optional `bottom` / `left` / `right`, `thumb`; black line art on
  white). Adding a theme = image folder + catalogue entry + `journals.themes.<id>` in both message files.
- Colouring the decoration: `monthThemes[].fills` holds "paint bucket" clicks (band, x, y as fractions, colour);
  the web repaints them on a canvas (`components/journal/coloring.ts`, pure and unit-tested, + `calendar-frame.tsx`).
  Flood fill stops at dark strokes, so artwork needs closed shapes; changing a month's theme clears its colouring,
  except band `title` (the only one allowed without a theme: such a month is stored with `theme: null`): the Journal calendar's heading (`month-title.tsx`), the month's name drawn on a fixed-size
  canvas as hollow letters (`--font-month`, Ribeye, outline only), coloured like the bands (inside letters only), or
  all at once in a pastel from the decoration dialog (`letterSeeds`: one fill per letter, holes of "o" left out).
- Month summary (`components/journal/month-summary.tsx`, centred at the top of the Journal page, between "Today" and the other actions): the displayed
  month's arrows (sum of the loaded summaries' `arrowCount`) and its satisfaction, 5 stars by halves
  (`monthSatisfactions` on the journal, `PUT /journals/{id}/months/{month}/satisfaction`; read-only for a coach).
  A click cycles the star empty → half → full → empty, those before it full, those after it empty (`month-stars.ts`).
- Event sheet (`/archer/journal/[id]`): a loose leaf (`components/notebook/loose-leaf.tsx`, ruled every `--step`
  = 30px) drawn by `SessionForm`, its action bar sticky above it. `RuledStack` pushes each box onto a ruled line;
  names, Informations rows (`FieldRow`, xs fields = one line) and free texts (`RULED_TEXT`) are sized to sit on the
  lines — keep new content on that grid. At most 4 events per day (`DAY_FULL`, checked by the API); the month view
  shows one entry per day with up to 4 icons. Planning vs review: on a future day the sheet only takes date,
  duration, place, discipline, distance and objective (the rest greyed, `locked` in `SessionForm`, also given to the photos through
  `SheetLockedContext`: no upload); the API's
  `completed` (derived: any review field filled; always true for strength / other / custom) and the date decide
  the calendars' greying (`pendingReason` in `event-display.tsx`: review missing, or a type without review on a future day).
  Event icons (`session-types.ts`): drawings in
  `public/icons/events/` (`imageIcon` = one-colour mask, `pictureIcon` = own colours).
- Custom event types: an archer defines up to 4 (`/journal/event-types`: title, colour, icon; `LIMIT_REACHED`),
  offered after the built-in types in the new-event dialog ("+" card, pencil to edit) and in the legend.
  Their events are `CUSTOM` (`customTypeId`, set at creation only; summaries embed `customType`) with a free text
  only. `OTHER` ("Divers") is no longer offered but old events keep it; deleting a custom type turns its events
  into `OTHER` events with the same title / colour / icon.
- Indicators (`/archer/stats`): `GET /journal/sessions/stats?from&to` (both optional = all time) returns raw figures
  (competitions, `scores` of trainings / coachings / competitions, arrows and minutes per day, `eventsByDay` per type,
  `physicalFeelingsByDay` / `mentalFeelingsByDay`; the events and feelings cards are HTML histograms, `BarColumns`, above the type icons /
  the faces of `components/journal/feelings.ts`; the events card shows the built-in types only: custom and "Divers" events are left out); charts stop at today, written "Auj."
  on the axis (`withToday`), with a centred choice bar (`ChoiceBar`) on top; the web draws them with
  `@mantine/charts` (`components/stats/`). Chart colours are CSS variables in `stats.module.css` (light + dark sets
  checked for colour-blind separation); a discipline keeps its colour slot (`disciplineColor`).
  A star on each card (goals aside) picks the favourite indicator (`favoriteIndicator` in the API's archer
  profile, `components/stats/favorite.tsx`), shown on the right page of the archer home notebook
  (`lib/stats.ts` loads the figures for both pages).
- Goals (`apps/api/src/goals/`, card on the Indicators page): type, description, the day it was set (`createdOn`,
  editable) and the day it was reached (`achievedOn`; null = not reached — there is no separate boolean). They belong
  to the archer, not to a journal or period.
- Event photos: files go to S3-compatible storage through `StorageService` (`apps/api/src/storage/`, a local
  Versity Gateway on :9000 in dev, an in-memory fake in e2e tests); the DB keeps one `SessionPhoto` row. Uploads are
  re-encoded with `sharp` (2000 px + thumbnail, metadata dropped) and read back through 10-minute signed URLs.
  Deleting an event or a journal must also remove the files (`PhotosService.removeFiles`).
- Archer profile (`apps/api/src/profile/`, web `components/profile/`): sport details, favourite websites and people
  invited by email. A plain guest's invitation (public `/invitations/accept`, token used on POST) grants no access;
  a coach's does (see Coaching).
- `@mantine/schedule` 9.6.3 leaks some props to the DOM from MonthView / YearView: don't pass `mode="static"`,
  and pass `onTimeSlotClick` / `onAllDaySlotClick` only in day / week views (see `components/journal/journal-view.tsx`).
- Mantine `Slider`: accessible name goes in `thumbLabel`, not `aria-label`.
- `pnpm openapi` compiles to `apps/api/dist-openapi/`, safe while `pnpm dev` runs; `pnpm build` is not (it rewrites `apps/api/dist`).
- Forms posting to Server Actions: keep user input in React state (controlled inputs) — React resets
  uncontrolled fields after each submission, even when the server rejects it.
- Dev emails land in Mailpit (http://localhost:8025). e2e tests capture mail and fake ID tokens (`apps/api/test/helpers.ts`).
- TypeScript is pinned to 6.0 (TS 7 is not yet supported by typescript-eslint / tooling).

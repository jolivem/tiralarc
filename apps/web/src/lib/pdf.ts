import 'server-only';
import { chromium, type Page } from 'playwright-core';
import {
  BLANK_ATTRIBUTE,
  CHAPTER_ATTRIBUTE,
  CHAPTER_PAGE_ATTRIBUTE,
  HIDDEN_ATTRIBUTE,
  READY_ATTRIBUTE,
  SPREAD_ATTRIBUTE,
} from '@/components/print/markers';
import { ACCESS_COOKIE } from './session';

/**
 * Where Chromium opens the printed page: this server itself, not its public address (which
 * may sit behind a proxy). `PRINT_BASE_URL` overrides it.
 */
const BASE_URL = process.env.PRINT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
/** The page's content width at 96 dpi (A5, 10 mm side margins: print.module.css). */
const VIEWPORT = { width: 484, height: 703 };
/** A season's extract with photos takes a while; past this, give up. */
const TIMEOUT_MS = 120_000;

/**
 * `VPS_WITH_2GB_RAM` (1 / true): a small server, where each Chromium takes a few hundred MB
 * and a full CPU. Extracts are then printed one at a time (the others wait their turn) by a
 * Chromium started with fewer features.
 */
const SMALL_SERVER = ['1', 'true', 'yes'].includes(
  (process.env.VPS_WITH_2GB_RAM ?? '').trim().toLowerCase(),
);
const SMALL_SERVER_ARGS = [
  // Docker's /dev/shm is 64 MB: shared memory goes to /tmp instead of crashing the tab.
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--mute-audio',
  '--renderer-process-limit=1',
];

/** The extract being printed, when they go one at a time: the next one waits for it. */
let printing: Promise<unknown> = Promise.resolve();

/**
 * Prints `path` (a page of this site, e.g. "/fr/print/journal?…") to PDF in a headless
 * Chromium signed in with the user's access token — only that one: the refresh token is
 * single-use and stays with the browser. `CHROMIUM_PATH` names the browser (the Docker
 * image's); otherwise Playwright's own (`playwright-core install chromium-headless-shell`).
 */
export function renderPdf(path: string, accessToken: string): Promise<Uint8Array> {
  if (!SMALL_SERVER) return printExtract(path, accessToken);
  const turn = printing.then(() => printExtract(path, accessToken));
  printing = turn.catch(() => undefined);
  return turn;
}

async function printExtract(path: string, accessToken: string): Promise<Uint8Array> {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: SMALL_SERVER ? SMALL_SERVER_ARGS : [],
  });
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      colorScheme: 'light',
      deviceScaleFactor: 2,
    });
    await context.addCookies([
      { name: ACCESS_COOKIE, value: accessToken, url: BASE_URL, httpOnly: true, sameSite: 'Lax' },
    ]);
    const page = await context.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);
    await page.emulateMedia({ media: 'print' });
    const response = await page.goto(new URL(path, BASE_URL).toString(), { waitUntil: 'load' });
    if (!response?.ok()) throw new Error(`Printed page answered ${response?.status()}`);
    await page.waitForSelector(`html[${READY_ATTRIBUTE}]`, { state: 'attached' });
    await faceSpreads(page);
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}

const print = (page: Page) => page.pdf({ preferCSSPageSize: true, printBackground: true });

/**
 * Pages of a PDF printed by Chromium: its page objects (`/Type /Page`, not `/Pages`), which
 * it writes as plain dictionaries.
 */
const pageCount = (pdf: Uint8Array) =>
  Buffer.from(pdf)
    .toString('latin1')
    .match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;

/**
 * Puts each month's double page on facing pages, its left page even (`[SPREAD_ATTRIBUTE]`),
 * and each chapter's title page on a right-hand page, odd (`[CHAPTER_ATTRIBUTE]`): Chromium
 * ignores `break-before: left / right`, and only its own printing tells how many pages the
 * rest takes (charts and sheets lay out differently on paper). So the parts between two of
 * them are printed alone, their pages counted, and the blank page before one shown when it
 * would land on the wrong side. Each chapter's first page is then written in the index
 * (`[CHAPTER_PAGE_ATTRIBUTE]`). A few small trial prints, one per month or chapter.
 */
async function faceSpreads(page: Page) {
  await page.addStyleTag({ content: `[${HIDDEN_ATTRIBUTE}] { display: none !important; }` });
  // The extract's parts in order: a month's left page, a chapter's title page, a blank page,
  // or anything else printed (runs of these between two of the first make one trial print).
  const parts = await page.evaluate(
    ([spread, chapter, blank]) => {
      const extract = document.querySelector(`[${spread}], [${chapter}]`)?.parentElement;
      return [...(extract?.children ?? [])].map((part) => {
        if (part.hasAttribute(spread)) return { kind: 'spread', id: part.id };
        if (part.hasAttribute(chapter)) return { kind: 'chapter', id: part.id };
        if (part.hasAttribute(blank)) return { kind: 'blank', id: '' };
        const style = getComputedStyle(part);
        const hidden = style.display === 'none' || style.position === 'absolute';
        return { kind: hidden ? 'none' : 'part', id: '' };
      });
    },
    [SPREAD_ATTRIBUTE, CHAPTER_ATTRIBUTE, BLANK_ATTRIBUTE] as const,
  );
  const kinds = parts.map((p) => p.kind);
  if (!kinds.includes('spread') && !kinds.includes('chapter')) return;

  const only = async (shown: number[]) => {
    await page.evaluate(
      ([spread, chapter, hidden, shown]) => {
        const extract = document.querySelector(`[${spread}], [${chapter}]`)!.parentElement!;
        [...extract.children].forEach((part, i) =>
          part.toggleAttribute(hidden, !shown.includes(i)),
        );
      },
      [SPREAD_ATTRIBUTE, CHAPTER_ATTRIBUTE, HIDDEN_ATTRIBUTE, shown] as const,
    );
    // A chart that was hidden is drawn again a moment after it shows: printing sooner loses it.
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.recharts-responsive-container')]
        .filter((chart) => chart.getClientRects().length > 0)
        .every((chart) => chart.querySelector('.recharts-surface')),
    );
  };

  let pages = 0;
  let run: number[] = [];
  const countRun = async () => {
    if (run.length === 0) return;
    await only(run);
    pages += pageCount(await print(page));
    run = [];
  };
  const chapterPages: Record<string, number> = {};
  for (const [i, { kind, id }] of parts.entries()) {
    if (kind === 'part') run.push(i);
    if (kind !== 'spread' && kind !== 'chapter') continue;
    await countRun();
    // A month's left page must be even, a chapter's title page odd: the page it would land
    // on is `pages + 1`.
    const wrongSide = kind === 'spread' ? pages % 2 === 0 : pages % 2 === 1;
    if (wrongSide) {
      // The blank page just before it is printed.
      await page.evaluate(
        ([spread, chapter, blank, i]) => {
          const extract = document.querySelector(`[${spread}], [${chapter}]`)!.parentElement!;
          extract.children[i]?.previousElementSibling?.setAttribute(blank, 'shown');
        },
        [SPREAD_ATTRIBUTE, CHAPTER_ATTRIBUTE, BLANK_ATTRIBUTE, i] as const,
      );
      pages += 1;
    }
    // Chapters and months (their left page) in the index.
    if (id) chapterPages[id] = pages + 1;
    pages += 1;
  }
  await only(kinds.map((_, i) => i));
  // The index: each chapter's first page.
  await page.evaluate(
    ([attribute, chapterPages]) => {
      for (const cell of document.querySelectorAll(`[${attribute}]`)) {
        const number = chapterPages[cell.getAttribute(attribute) ?? ''];
        if (number) cell.textContent = String(number);
      }
    },
    [CHAPTER_PAGE_ATTRIBUTE, chapterPages] as const,
  );
}

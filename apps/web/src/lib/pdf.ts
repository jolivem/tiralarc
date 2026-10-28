import 'server-only';
import { chromium, type Page } from 'playwright-core';
import {
  BLANK_ATTRIBUTE,
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
 * Prints `path` (a page of this site, e.g. "/fr/print/journal?…") to PDF in a headless
 * Chromium signed in with the user's access token — only that one: the refresh token is
 * single-use and stays with the browser. `CHROMIUM_PATH` names the browser (the Docker
 * image's); otherwise Playwright's own (`playwright-core install chromium-headless-shell`).
 */
export async function renderPdf(path: string, accessToken: string): Promise<Uint8Array> {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
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
 * Puts each month's double page on facing pages, its left page even (`[SPREAD_ATTRIBUTE]`):
 * Chromium ignores `break-before: left`, and only its own printing tells how many pages the
 * rest takes (charts and sheets lay out differently on paper). So the parts between two
 * months are printed alone, their pages counted, and the blank page before a month shown
 * when its left page would land on an odd one. A few small trial prints, one per month.
 */
async function faceSpreads(page: Page) {
  await page.addStyleTag({ content: `[${HIDDEN_ATTRIBUTE}] { display: none !important; }` });
  // The extract's parts in order: a month's left page, its blank page, or anything else
  // printed (runs of these between two months make one trial print).
  const kinds = await page.evaluate(
    ([spread, blank]) => {
      const extract = document.querySelector(`[${spread}]`)?.parentElement;
      return [...(extract?.children ?? [])].map((part) => {
        if (part.hasAttribute(spread)) return 'spread';
        if (part.hasAttribute(blank)) return 'blank';
        const style = getComputedStyle(part);
        return style.display === 'none' || style.position === 'absolute' ? 'none' : 'part';
      });
    },
    [SPREAD_ATTRIBUTE, BLANK_ATTRIBUTE] as const,
  );
  if (!kinds.includes('spread')) return;

  const only = (shown: number[]) =>
    page.evaluate(
      ([spread, hidden, shown]) => {
        const extract = document.querySelector(`[${spread}]`)!.parentElement!;
        [...extract.children].forEach((part, i) =>
          part.toggleAttribute(hidden, !shown.includes(i)),
        );
      },
      [SPREAD_ATTRIBUTE, HIDDEN_ATTRIBUTE, shown] as const,
    );

  let pages = 0;
  let run: number[] = [];
  const countRun = async () => {
    if (run.length === 0) return;
    await only(run);
    pages += pageCount(await print(page));
    run = [];
  };
  for (const [i, kind] of kinds.entries()) {
    if (kind === 'part') run.push(i);
    if (kind !== 'spread') continue;
    await countRun();
    if (pages % 2 === 0) {
      // The left page would be odd: the blank page just before it is printed.
      await page.evaluate(
        ([spread, blank, i]) => {
          const part = document.querySelector(`[${spread}]`)!.parentElement!.children[i];
          part?.previousElementSibling?.setAttribute(blank, 'shown');
        },
        [SPREAD_ATTRIBUTE, BLANK_ATTRIBUTE, i] as const,
      );
      pages += 1;
    }
    pages += 1;
  }
  await only(kinds.map((_, i) => i));
}

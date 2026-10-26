import 'server-only';
import { chromium } from 'playwright-core';
import { READY_ATTRIBUTE } from '@/components/print/markers';
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
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}

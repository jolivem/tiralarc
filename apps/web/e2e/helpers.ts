import { type Browser, chromium, type Page } from 'playwright-core';

/** The running app (`pnpm dev`), and Mailpit, where the dev emails land. */
export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';

export function launch(): Promise<Browser> {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
}

/** A fresh page (its own cookies), at desktop size, in French. */
export async function newPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    locale: 'fr-FR',
    viewport: { width: 1360, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return page;
}

/** A guided tour that started by itself: skipped (Escape), so it doesn't cover the page. */
export async function skipTour(page: Page): Promise<void> {
  const tour = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: 'Passer la visite' }) });
  try {
    await tour.waitFor({ state: 'visible', timeout: 3_000 });
    await page.keyboard.press('Escape');
    await tour.waitFor({ state: 'hidden' });
  } catch {
    // No tour on this page, or already seen.
  }
}

/** The link of the last email sent to `to` whose path contains `path` (Mailpit's API). */
export async function emailedLink(to: string, path: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    );
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0]!.ID}`);
      const { Text } = (await message.json()) as { Text: string };
      const link = Text.match(new RegExp(`https?://\\S*${path}\\S*`))?.[0];
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email with a ${path} link for ${to}`);
}

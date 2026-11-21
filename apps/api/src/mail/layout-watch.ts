import { Logger } from '@nestjs/common';
import type { MailService } from './mail.service.js';
import type { AlertSite } from './templates.js';

/** Readings of a page in a row that must go wrong before anyone is told (one odd page is not). */
export const ALERT_AFTER = 3;
/** At most one email a day per page while it stays broken. */
export const ALERT_EVERY_MS = 24 * 60 * 60 * 1000;

/**
 * Watches the readings of an outside website the app reads without an API (the FFTA's,
 * ianseo.net): when one of its pages keeps coming back in a shape the parsers no longer
 * recognise (the site changed its layout, or an address), an alert email goes to ALERTS_EMAIL.
 * Kept in memory: a restart starts counting again. `names`: each page, as the email names it.
 */
export class LayoutWatch<K extends string> {
  private readonly logger: Logger;
  private readonly state = new Map<K, { failures: number; alertedAt: number | null }>();

  constructor(
    private readonly mail: MailService,
    private readonly site: AlertSite,
    private readonly names: Record<K, string>,
  ) {
    this.logger = new Logger(`${site}Watch`);
  }

  /** The page was read as expected. */
  ok(kind: K): void {
    const state = this.state.get(kind);
    if (state) state.failures = 0;
  }

  /** The page didn't look as expected: `problem` says how. */
  anomaly(kind: K, url: string, problem: string): void {
    const state = this.state.get(kind) ?? { failures: 0, alertedAt: null };
    this.state.set(kind, state);
    state.failures += 1;
    this.logger.warn(`${this.site} page not recognised (${kind}, ${url}): ${problem}`);
    if (state.failures < ALERT_AFTER) return;
    const now = Date.now();
    if (state.alertedAt !== null && now - state.alertedAt < ALERT_EVERY_MS) return;
    state.alertedAt = now;
    this.mail
      .sendLayoutAlert({
        site: this.site,
        page: this.names[kind],
        url,
        problem,
        failures: state.failures,
      })
      .catch((error: unknown) => {
        // Try again on the next anomaly rather than wait a day.
        state.alertedAt = null;
        this.logger.error(`${this.site} layout alert not sent: ${String(error)}`);
      });
  }
}

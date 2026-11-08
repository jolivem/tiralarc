import { setTimeout as sleep } from 'node:timers/promises';
import { Injectable } from '@nestjs/common';

const BASE_URL = 'https://www.ianseo.net';
const USER_AGENT = 'Tiralarc/1.0 (feuilles de marque)';
const TIMEOUT_MS = 60_000;
/** Between two requests: the site is run by volunteers. */
const PAUSE_MS = 1_000;

/** Reads the public pages of ianseo.net (no API), one request at a time. */
@Injectable()
export class IanseoClient {
  private queue: Promise<unknown> = Promise.resolve();

  /** The list of a year's French competitions (HTML). */
  async tours(year: number): Promise<string> {
    const response = await this.get(`/TourList.php?Year=${year}&countryid=FRA&comptime=0`);
    return response.text();
  }

  /** A competition's page (HTML): the links to its documents. */
  async details(tourId: number): Promise<string> {
    const response = await this.get(`/Details.php?toId=${tourId}`);
    return response.text();
  }

  /** A document linked from a competition's page (a site path). */
  async file(path: string): Promise<Uint8Array> {
    const response = await this.get(encodeURI(path));
    return new Uint8Array(await response.arrayBuffer());
  }

  private get(path: string): Promise<Response> {
    const request = this.queue.then(async () => {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`ianseo answered ${response.status} for ${path}`);
      // Read here, so the next request waits for this one to be over.
      const body = await response.arrayBuffer();
      await sleep(PAUSE_MS);
      return new Response(body);
    });
    this.queue = request.catch(() => undefined);
    return request;
  }
}

import { Injectable } from '@nestjs/common';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Honest, as for the FFTA website. */
const USER_AGENT = 'Tiralarc/1.0';
const TIMEOUT_MS = 5000;

interface AddressFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: { context?: string; type?: string };
}

/**
 * The French government's address search (https://api-adresse.data.gouv.fr, free, no key):
 * a town's coordinates. Only the town's name (and department) is sent. e2e tests replace it.
 */
@Injectable()
export class AddressClient {
  /**
   * The town (municipality) named `city`, in `department` when given (its code, e.g. "35",
   * "2A"); null when there is none; undefined when the service could not be reached (asked
   * again later).
   */
  async municipality(city: string, department?: string): Promise<Coordinates | null | undefined> {
    const url = new URL('https://api-adresse.data.gouv.fr/search/');
    url.searchParams.set('q', city);
    url.searchParams.set('type', 'municipality');
    url.searchParams.set('limit', '10');
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) return undefined;
      const { features = [] } = (await response.json()) as { features?: AddressFeature[] };
      // "35, Ille-et-Vilaine, Bretagne": the department's code first.
      const found = features.find(
        (f) => !department || f.properties?.context?.split(',')[0]?.trim() === department,
      );
      const [longitude, latitude] = found?.geometry?.coordinates ?? [];
      return latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null;
    } catch {
      return undefined;
    }
  }
}

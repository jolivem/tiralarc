import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddressClient, type Coordinates } from './address.client.js';

/** Looked up at once, at most (the service allows 50 a second). */
const CONCURRENCY = 8;

/** A town's key: its department and its name, in capitals, without accents or punctuation. */
export function placeKey(city: string, department?: string | null): string {
  const name = city
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
  return `${department ?? ''}|${name}`.slice(0, 160);
}

/**
 * French towns' coordinates (the competitions map), looked up once through `AddressClient`
 * and kept: in memory, and in the database (table `geocoded_places`) across restarts. A town
 * not found is remembered as such; a failed lookup is tried again next time.
 */
@Injectable()
export class GeocoderService {
  private readonly memory = new Map<string, Coordinates | null>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly address: AddressClient,
  ) {}

  async locate(city: string, department?: string | null): Promise<Coordinates | null> {
    const key = placeKey(city, department);
    if (this.memory.has(key)) return this.memory.get(key) ?? null;
    const stored = await this.prisma.geocodedPlace.findUnique({ where: { key } });
    if (stored) {
      const coordinates =
        stored.latitude !== null && stored.longitude !== null
          ? { latitude: stored.latitude, longitude: stored.longitude }
          : null;
      this.memory.set(key, coordinates);
      return coordinates;
    }
    let found = await this.address.municipality(city, department ?? undefined);
    // A department's search may list a competition held elsewhere: the town anywhere, then.
    if (found === null && department) found = await this.address.municipality(city);
    // Unreachable: nothing kept, asked again next time.
    if (found === undefined) return null;
    this.memory.set(key, found);
    await this.prisma.geocodedPlace.upsert({
      where: { key },
      create: { key, latitude: found?.latitude ?? null, longitude: found?.longitude ?? null },
      update: {},
    });
    return found;
  }

  /** Several towns, a few at a time; by their `placeKey`. */
  async locateAll(
    places: { city: string; department?: string | null }[],
  ): Promise<Map<string, Coordinates | null>> {
    const unique = new Map(places.map((p) => [placeKey(p.city, p.department), p]));
    const located = new Map<string, Coordinates | null>();
    const queue = [...unique.entries()];
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          const [key, { city, department }] = next;
          located.set(key, await this.locate(city, department));
        }
      }),
    );
    return located;
  }
}

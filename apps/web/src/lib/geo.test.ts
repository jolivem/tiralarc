import { describe, expect, it } from 'vitest';
import { byPlace, distanceKm } from './geo';

describe('distanceKm', () => {
  it('measures as the crow flies', () => {
    const paris = { latitude: 48.8566, longitude: 2.3522 };
    const rennes = { latitude: 48.1173, longitude: -1.6778 };
    // About 308 km between the two.
    expect(distanceKm(paris, rennes)).toBeGreaterThan(300);
    expect(distanceKm(paris, rennes)).toBeLessThan(315);
    expect(distanceKm(paris, paris)).toBe(0);
  });
});

describe('byPlace', () => {
  it("gathers a town's items in one place, leaving out those without coordinates", () => {
    const places = byPlace([
      { id: 'a', latitude: 48.1, longitude: -1.6 },
      { id: 'b', latitude: null, longitude: null },
      { id: 'c', latitude: 47.2, longitude: -1.5 },
      { id: 'd', latitude: 48.1, longitude: -1.6 },
    ]);
    expect(places.map((p) => p.items.map((i) => i.id))).toEqual([['a', 'd'], ['c']]);
  });
});

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** The distance between two places as the crow flies, in km (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Items gathered by place (same coordinates): one point on the map for a town's competitions.
 * Items without coordinates are left out; places in the order their first item comes.
 */
export function byPlace<T extends { latitude: number | null; longitude: number | null }>(
  items: readonly T[],
): { latitude: number; longitude: number; items: T[] }[] {
  const places = new Map<string, { latitude: number; longitude: number; items: T[] }>();
  for (const item of items) {
    if (item.latitude === null || item.longitude === null) continue;
    const key = `${item.latitude},${item.longitude}`;
    const place = places.get(key) ?? {
      latitude: item.latitude,
      longitude: item.longitude,
      items: [],
    };
    place.items.push(item);
    places.set(key, place);
  }
  return [...places.values()];
}

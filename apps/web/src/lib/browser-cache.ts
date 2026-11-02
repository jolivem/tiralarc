/**
 * What the home page read from the FFTA (national rankings, competitions to plan), kept in the
 * browser an hour so coming back to it doesn't load them again. Per browser only, and a mere
 * convenience: storage may be unavailable (private browsing…), then everything is loaded.
 */

const PREFIX = 'tl:cache:';
export const CACHE_HOUR = 60 * 60 * 1000;

/** A short, steady name for `scope` (the archer and the profile settings the data depend on). */
function hash(scope: string): string {
  let h = 5381;
  for (let i = 0; i < scope.length; i++) h = ((h * 33) ^ scope.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const keyOf = (kind: string, scope: string) => `${PREFIX}${kind}:${hash(scope)}`;

/** The value kept for `kind` and `scope`, while fresh; undefined otherwise. */
export function readCached<T>(kind: string, scope: string): T | undefined {
  try {
    const stored = localStorage.getItem(keyOf(kind, scope));
    if (!stored) return undefined;
    const { value, until } = JSON.parse(stored) as { value: T; until: number };
    return Date.now() < until ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Keeps `value` for `ttl`; what was kept for another scope of `kind` (old settings) goes. */
export function writeCached<T>(kind: string, scope: string, value: T, ttl = CACHE_HOUR) {
  try {
    const key = keyOf(kind, scope);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const other = localStorage.key(i);
      if (other?.startsWith(`${PREFIX}${kind}:`) && other !== key) localStorage.removeItem(other);
    }
    localStorage.setItem(key, JSON.stringify({ value, until: Date.now() + ttl }));
  } catch {
    // Not kept: loaded again next time.
  }
}

/** Changes the value kept for `kind` and `scope` (still fresh), keeping its expiry. */
export function updateCached<T>(kind: string, scope: string, change: (value: T) => T) {
  try {
    const key = keyOf(kind, scope);
    const stored = localStorage.getItem(key);
    if (!stored) return;
    const entry = JSON.parse(stored) as { value: T; until: number };
    localStorage.setItem(key, JSON.stringify({ ...entry, value: change(entry.value) }));
  } catch {
    // Nothing kept.
  }
}

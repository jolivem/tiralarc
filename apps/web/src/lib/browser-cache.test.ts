import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_HOUR, readCached, updateCached, writeCached } from './browser-cache';

/** A Map behind the Storage methods the cache uses. */
function fakeStorage() {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    key: (i: number) => [...items.keys()][i] ?? null,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe('browser cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', fakeStorage());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps a value an hour, for its scope only', () => {
    writeCached('rankings', 'archer A', { rank: 3 });
    expect(readCached('rankings', 'archer A')).toEqual({ rank: 3 });
    expect(readCached('rankings', 'archer B')).toBeUndefined();
    vi.advanceTimersByTime(CACHE_HOUR - 1);
    expect(readCached('rankings', 'archer A')).toEqual({ rank: 3 });
    vi.advanceTimersByTime(1);
    expect(readCached('rankings', 'archer A')).toBeUndefined();
  });

  it('drops what another scope of the same kind kept, and changes a value in place', () => {
    writeCached('toPlan', 'old settings', [1]);
    writeCached('rankings', 'old settings', [9]);
    writeCached('toPlan', 'new settings', [1, 2]);
    expect(localStorage.length).toBe(2);
    expect(readCached('rankings', 'old settings')).toEqual([9]);
    updateCached<number[]>('toPlan', 'new settings', (list) => [...list, 3]);
    expect(readCached('toPlan', 'new settings')).toEqual([1, 2, 3]);
  });

  it('does without storage', () => {
    vi.stubGlobal('localStorage', undefined);
    writeCached('rankings', 'archer A', 1);
    expect(readCached('rankings', 'archer A')).toBeUndefined();
  });
});

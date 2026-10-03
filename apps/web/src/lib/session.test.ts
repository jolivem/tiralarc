import { describe, expect, it } from 'vitest';
import { ACCESS_COOKIE, clearSession, REFRESH_COOKIE, writeSession } from './session';

function fakeCookieStore() {
  const jar = new Map<string, { value: string; options: Record<string, unknown> }>();
  return {
    jar,
    set: (name: string, value: string, options: Record<string, unknown>) =>
      jar.set(name, { value, options }),
    delete: (name: string) => jar.delete(name),
  };
}

describe('session cookies', () => {
  const tokens = {
    accessToken: 'access',
    refreshToken: 'refresh',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
    refreshExpiresIn: 2_592_000,
  };

  it('stores both tokens in httpOnly cookies, access expiring before the JWT', () => {
    const store = fakeCookieStore();
    writeSession(store, tokens);

    expect(store.jar.get(ACCESS_COOKIE)).toMatchObject({
      value: 'access',
      options: { httpOnly: true, maxAge: 870 },
    });
    expect(store.jar.get(REFRESH_COOKIE)?.options.maxAge).toBe(2_592_000);
  });

  it('clears the session', () => {
    const store = fakeCookieStore();
    writeSession(store, tokens);
    clearSession(store);
    expect(store.jar.size).toBe(0);
  });
});

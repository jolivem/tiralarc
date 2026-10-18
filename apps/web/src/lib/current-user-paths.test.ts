import { describe, expect, it } from 'vitest';
import { activeProfile, homePathFor } from './current-user-paths';

describe('profiles', () => {
  it('uses the chosen profile when the user holds it, otherwise archer first', () => {
    expect(activeProfile(['ARCHER', 'COACH'], 'COACH')).toBe('COACH');
    expect(activeProfile(['ARCHER', 'COACH'], undefined)).toBe('ARCHER');
    expect(activeProfile(['ARCHER'], 'COACH')).toBe('ARCHER'); // role since removed
    expect(activeProfile(['ARCHER', 'COACH'], 'ADMIN')).toBe('ARCHER');
    expect(activeProfile(['COACH'])).toBe('COACH');
    expect(activeProfile([])).toBeNull();
  });

  it('sends the archer profile to the archer area, the coach profile to the account page', () => {
    expect(homePathFor(['ARCHER', 'COACH'])).toBe('/archer');
    expect(homePathFor(['ARCHER', 'COACH'], 'COACH')).toBe('/account');
    expect(homePathFor(['COACH'])).toBe('/account');
    expect(homePathFor([])).toBe('/account');
  });
});

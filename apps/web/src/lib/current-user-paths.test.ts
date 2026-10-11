import { describe, expect, it } from 'vitest';
import { activeProfile, hasBothProfiles, homePathFor } from './current-user-paths';

describe('profiles', () => {
  it('asks only users who are both archer and coach', () => {
    expect(hasBothProfiles(['ARCHER', 'COACH'])).toBe(true);
    expect(hasBothProfiles(['ARCHER'])).toBe(false);
    expect(hasBothProfiles(['COACH', 'ADMIN'])).toBe(false);
  });

  it('uses the chosen profile when the user holds it, otherwise archer first', () => {
    expect(activeProfile(['ARCHER', 'COACH'], 'COACH')).toBe('COACH');
    expect(activeProfile(['ARCHER', 'COACH'], undefined)).toBe('ARCHER');
    expect(activeProfile(['ARCHER'], 'COACH')).toBe('ARCHER'); // role since removed
    expect(activeProfile(['ARCHER', 'COACH'], 'ADMIN')).toBe('ARCHER');
    expect(activeProfile(['COACH'])).toBe('COACH');
    expect(activeProfile([])).toBeNull();
  });

  it('sends the archer profile to the archer area, everyone else to the account page', () => {
    expect(homePathFor(['ARCHER', 'COACH'])).toBe('/archer');
    expect(homePathFor(['ARCHER', 'COACH'], 'COACH')).toBe('/account');
    expect(homePathFor(['COACH'])).toBe('/account');
    expect(homePathFor([])).toBe('/account');
  });
});

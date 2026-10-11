import type { Role, SelfAssignableRole } from '@tiralarc/api-client';

/**
 * Profile chosen at sign-in by users who are both archer and coach (a web-only
 * preference: the API keeps granting both roles). Cleared at sign-in and sign-out.
 */
export const PROFILE_COOKIE = 'tl_profile';

export type Profile = SelfAssignableRole;

/** Archers who also coach pick the profile they sign in with. */
export function hasBothProfiles(roles: Role[]): boolean {
  return roles.includes('ARCHER') && roles.includes('COACH');
}

/** The profile the user works with: the chosen one if they hold it, otherwise archer first. */
export function activeProfile(roles: Role[], chosen?: string): Profile | null {
  if ((chosen === 'ARCHER' || chosen === 'COACH') && roles.includes(chosen)) return chosen;
  if (roles.includes('ARCHER')) return 'ARCHER';
  if (roles.includes('COACH')) return 'COACH';
  return null;
}

/** Where a user lands after signing in, depending on their roles and chosen profile. */
export function homePathFor(roles: Role[], chosen?: string): '/archer' | '/account' {
  return activeProfile(roles, chosen) === 'ARCHER' ? '/archer' : '/account';
}

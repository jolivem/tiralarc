import type { Role } from '@tiralarc/api-client';

/**
 * Profile of users who are both archer and coach: set by the journal they open last in the
 * header's menu (their own → archer, one of their archers' → coach). A web-only preference
 * (the API keeps granting both roles) deciding where the logo leads. Cleared at sign-in and
 * sign-out.
 */
export const PROFILE_COOKIE = 'tl_profile';

export type Profile = Extract<Role, 'ARCHER' | 'COACH'>;

/** The profile the user works with: the last one opened if they hold it, otherwise archer first. */
export function activeProfile(roles: Role[], chosen?: string): Profile | null {
  if ((chosen === 'ARCHER' || chosen === 'COACH') && roles.includes(chosen)) return chosen;
  if (roles.includes('ARCHER')) return 'ARCHER';
  if (roles.includes('COACH')) return 'COACH';
  return null;
}

/**
 * Where a user lands after signing in (or through the logo), depending on their roles and
 * profile: an archer's home, otherwise the account page (a coach's list of archers is there).
 */
export function homePathFor(roles: Role[], chosen?: string): '/archer' | '/account' {
  return activeProfile(roles, chosen) === 'ARCHER' ? '/archer' : '/account';
}

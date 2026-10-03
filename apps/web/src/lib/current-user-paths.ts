import type { Role } from '@tiralarc/api-client';

/** Where a user lands after signing in, depending on their roles. */
export function homePathFor(roles: Role[]): '/archer' | '/account' {
  return roles.includes('ARCHER') ? '/archer' : '/account';
}

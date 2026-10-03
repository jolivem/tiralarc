import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users holding at least one of the given roles.
 * Roles come from the access token, so a change takes effect at the next refresh (≤ 15 min).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

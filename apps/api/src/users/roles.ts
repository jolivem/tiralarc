import { Role } from '../generated/prisma/client.js';

/**
 * What to load with a user to know their roles: the stored ones (ARCHER for everyone, ADMIN
 * granted by `user:make-admin`) and whether they still coach an archer.
 */
export const ROLES_INCLUDE = {
  roles: { select: { role: true } },
  coachedArchers: { select: { id: true }, take: 1 },
} as const;

/**
 * A user's roles, sorted. COACH isn't stored: a user is a coach while an archer's coach
 * invitation they accepted still exists (see `ProfileInvitation.coachId`).
 */
export function rolesOf(user: {
  roles: { role: Role }[];
  coachedArchers: { id: string }[];
}): Role[] {
  const roles = new Set<Role>(
    user.roles.map(({ role }) => role).filter((role) => role !== Role.COACH),
  );
  if (user.coachedArchers.length > 0) roles.add(Role.COACH);
  return [...roles].sort();
}

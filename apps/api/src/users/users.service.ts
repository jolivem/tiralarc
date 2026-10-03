import { Injectable, NotFoundException } from '@nestjs/common';
import { SELF_ASSIGNABLE_ROLES, type SelfAssignableRole } from '../auth/dto/auth.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserDto } from './dto/user.dto.js';

const userInclude = {
  roles: { select: { role: true } },
  identities: { select: { provider: true } },
} as const;

type UserRecord = Prisma.UserGetPayload<{ include: typeof userInclude }>;

function toDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    displayName: user.displayName,
    locale: user.locale,
    roles: user.roles.map(({ role }) => role).sort(),
    hasPassword: user.passwordHash !== null,
    providers: [...new Set(user.identities.map(({ provider }) => provider))],
    createdAt: user.createdAt,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id }, include: userInclude });
    if (!user) throw new NotFoundException('User not found');
    return toDto(user);
  }

  async list(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      include: userInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return users.map(toDto);
  }

  /** Replaces the user's ARCHER / COACH roles; ADMIN is left untouched. */
  async setSelfAssignableRoles(id: string, roles: SelfAssignableRole[]): Promise<UserDto> {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({
        where: {
          userId: id,
          role: { in: SELF_ASSIGNABLE_ROLES.filter((r) => !roles.includes(r)) },
        },
      }),
      this.prisma.userRole.createMany({
        data: roles.map((role) => ({ userId: id, role })),
        skipDuplicates: true,
      }),
    ]);
    return this.findById(id);
  }
}

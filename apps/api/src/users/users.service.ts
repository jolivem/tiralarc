import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserDto } from './dto/user.dto.js';
import { ROLES_INCLUDE, rolesOf } from './roles.js';

const userInclude = {
  ...ROLES_INCLUDE,
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
    roles: rolesOf(user),
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
}

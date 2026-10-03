import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserDto } from './dto/user.dto.js';

const publicUserFields = { id: true, email: true, displayName: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUserFields });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}

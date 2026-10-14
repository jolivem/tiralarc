import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import { type CustomEventType, SessionType } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type CreateCustomEventTypeDto,
  type CustomEventTypeDto,
  MAX_CUSTOM_TYPES,
  type UpdateCustomEventTypeDto,
} from './dto/journal.dto.js';
import { toCustomTypeDto } from './journal.service.js';

/** The event types an archer defines. Scoped to the owner: someone else's type is a 404. */
@Injectable()
export class EventTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /** In the order they were created. */
  async list(userId: string): Promise<CustomEventTypeDto[]> {
    const types = await this.prisma.customEventType.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return types.map(toCustomTypeDto);
  }

  async create(userId: string, dto: CreateCustomEventTypeDto): Promise<CustomEventTypeDto> {
    if ((await this.prisma.customEventType.count({ where: { userId } })) >= MAX_CUSTOM_TYPES) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.LIMIT_REACHED,
        `At most ${MAX_CUSTOM_TYPES} event types per archer`,
      );
    }
    const type = await this.prisma.customEventType.create({
      data: { userId, title: dto.title.trim(), color: dto.color, icon: dto.icon },
    });
    return toCustomTypeDto(type);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCustomEventTypeDto,
  ): Promise<CustomEventTypeDto> {
    await this.findOwned(userId, id);
    const type = await this.prisma.customEventType.update({
      where: { id },
      data: { title: dto.title?.trim(), color: dto.color, icon: dto.icon },
    });
    return toCustomTypeDto(type);
  }

  /** Its events stay, as `OTHER` events that look the same (title, colour, pictogram). */
  async remove(userId: string, id: string): Promise<void> {
    const type = await this.findOwned(userId, id);
    await this.prisma.$transaction([
      this.prisma.journalSession.updateMany({
        where: { customTypeId: id },
        data: {
          type: SessionType.OTHER,
          customTypeId: null,
          title: type.title,
          color: type.color,
          icon: type.icon,
        },
      }),
      this.prisma.customEventType.delete({ where: { id } }),
    ]);
  }

  private async findOwned(userId: string, id: string): Promise<CustomEventType> {
    const type = await this.prisma.customEventType.findFirst({ where: { id, userId } });
    if (!type) throw new NotFoundException('Event type not found');
    return type;
  }
}

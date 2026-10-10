import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import type { Goal } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateGoalDto, GoalDto, UpdateGoalDto } from './dto/goal.dto.js';

export const MAX_GOALS = 200;

/** "YYYY-MM-DD" ↔ DATE column (stored as UTC midnight, read back as the same calendar day). */
const toDbDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

function toDto(goal: Goal): GoalDto {
  return {
    id: goal.id,
    type: goal.type,
    description: goal.description,
    createdOn: fromDbDate(goal.createdOn),
    achieved: goal.achievedOn !== null,
    achievedOn: goal.achievedOn ? fromDbDate(goal.achievedOn) : null,
  };
}

/** Archers' goals. Scoped to the owner: someone else's goal is a 404. */
@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Goals still to reach first (most recent first), then the reached ones (latest first). */
  async list(userId: string): Promise<GoalDto[]> {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      orderBy: [{ createdOn: 'desc' }, { createdAt: 'desc' }],
    });
    const open = goals.filter((goal) => goal.achievedOn === null);
    const reached = goals
      .filter((goal) => goal.achievedOn !== null)
      .sort((a, b) => (b.achievedOn?.getTime() ?? 0) - (a.achievedOn?.getTime() ?? 0));
    return [...open, ...reached].map(toDto);
  }

  async create(userId: string, dto: CreateGoalDto): Promise<GoalDto> {
    if ((await this.prisma.goal.count({ where: { userId } })) >= MAX_GOALS) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.LIMIT_REACHED,
        `At most ${MAX_GOALS} goals per archer`,
      );
    }
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        type: dto.type,
        description: dto.description.trim(),
        createdOn: toDbDate(dto.createdOn ?? new Date().toISOString().slice(0, 10)),
        achievedOn: dto.achievedOn ? toDbDate(dto.achievedOn) : null,
      },
    });
    return toDto(goal);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto): Promise<GoalDto> {
    await this.findOwned(userId, id);
    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        type: dto.type,
        description: dto.description?.trim(),
        createdOn: dto.createdOn !== undefined ? toDbDate(dto.createdOn) : undefined,
        ...(dto.achievedOn !== undefined && {
          achievedOn: dto.achievedOn ? toDbDate(dto.achievedOn) : null,
        }),
      },
    });
    return toDto(goal);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.goal.delete({ where: { id } });
  }

  private async findOwned(userId: string, id: string): Promise<Goal> {
    const goal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }
}

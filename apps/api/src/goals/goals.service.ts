import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import type { Goal } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateGoalDto, GoalDto, UpdateGoalDto } from './dto/goal.dto.js';
import { goalProgress, type ProgressSession } from './goal-progress.js';

export const MAX_GOALS = 200;

/** "YYYY-MM-DD" ↔ DATE column (stored as UTC midnight, read back as the same calendar day). */
const toDbDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

function toDto(goal: Goal, progress: number | null): GoalDto {
  return {
    id: goal.id,
    type: goal.type,
    description: goal.description,
    createdOn: fromDbDate(goal.createdOn),
    achieved: goal.achievedOn !== null,
    achievedOn: goal.achievedOn ? fromDbDate(goal.achievedOn) : null,
    metric: goal.metric,
    target: goal.target,
    discipline: goal.discipline,
    distanceMeters: goal.distanceMeters,
    progress,
  };
}

/** A metric goes with a target, and the other way round. */
function checkFigures(metric: unknown, target: unknown): void {
  if ((metric === null) !== (target === null)) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.VALIDATION_FAILED,
      'A goal has both a metric and a target, or neither',
    );
  }
}

/**
 * Archers' goals. Scoped to the owner: someone else's goal is a 404. Figured goals (`metric`,
 * `target`) follow the archer's events: their progress is worked out when they are read, and a
 * goal not reached yet whose target was met is marked reached on that day (`goal-progress.ts`).
 */
@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Goals still to reach first (most recent first), then the reached ones (latest first). */
  async list(userId: string, now = new Date()): Promise<GoalDto[]> {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      orderBy: [{ createdOn: 'desc' }, { createdAt: 'desc' }],
    });
    const progress = await this.follow(userId, goals, fromDbDate(now));
    const open = goals.filter((goal) => goal.achievedOn === null);
    const reached = goals
      .filter((goal) => goal.achievedOn !== null)
      .sort((a, b) => (b.achievedOn?.getTime() ?? 0) - (a.achievedOn?.getTime() ?? 0));
    return [...open, ...reached].map((goal) => toDto(goal, progress.get(goal.id) ?? null));
  }

  async create(userId: string, dto: CreateGoalDto): Promise<GoalDto> {
    if ((await this.prisma.goal.count({ where: { userId } })) >= MAX_GOALS) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.LIMIT_REACHED,
        `At most ${MAX_GOALS} goals per archer`,
      );
    }
    checkFigures(dto.metric ?? null, dto.target ?? null);
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        type: dto.type,
        description: dto.description.trim(),
        createdOn: toDbDate(dto.createdOn ?? new Date().toISOString().slice(0, 10)),
        achievedOn: dto.achievedOn ? toDbDate(dto.achievedOn) : null,
        metric: dto.metric ?? null,
        target: dto.target ?? null,
        discipline: dto.metric === 'SCORE' ? (dto.discipline ?? null) : null,
        distanceMeters: dto.metric === 'SCORE' ? (dto.distanceMeters ?? null) : null,
      },
    });
    return this.one(userId, goal);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto): Promise<GoalDto> {
    const current = await this.findOwned(userId, id);
    const metric = dto.metric !== undefined ? dto.metric : current.metric;
    const target = dto.target !== undefined ? dto.target : current.target;
    checkFigures(metric, target);
    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        type: dto.type,
        description: dto.description?.trim(),
        createdOn: dto.createdOn !== undefined ? toDbDate(dto.createdOn) : undefined,
        ...(dto.achievedOn !== undefined && {
          achievedOn: dto.achievedOn ? toDbDate(dto.achievedOn) : null,
        }),
        metric,
        target,
        ...(dto.discipline !== undefined && { discipline: dto.discipline }),
        ...(dto.distanceMeters !== undefined && { distanceMeters: dto.distanceMeters }),
        // Only a score is shot at a discipline and distance.
        ...(metric !== 'SCORE' && { discipline: null, distanceMeters: null }),
      },
    });
    return this.one(userId, goal);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.goal.delete({ where: { id } });
  }

  /** One goal as read back (its progress worked out, reached if it is). */
  private async one(userId: string, goal: Goal): Promise<GoalDto> {
    const progress = await this.follow(userId, [goal], fromDbDate(new Date()));
    return toDto(goal, progress.get(goal.id) ?? null);
  }

  /**
   * The figured goals' progress, by id; those whose target was met (and not marked reached)
   * become reached on the day it was, here and in the database. `goals` are updated in place.
   */
  private async follow(userId: string, goals: Goal[], today: string): Promise<Map<string, number>> {
    const figured = goals.filter((g) => g.metric !== null && g.target !== null);
    const progress = new Map<string, number>();
    if (figured.length === 0) return progress;
    const since = figured.reduce(
      (min, g) => (g.createdOn < min ? g.createdOn : min),
      figured[0]!.createdOn,
    );
    const rows = await this.prisma.journalSession.findMany({
      where: { userId, date: { gte: since, lte: toDbDate(today) } },
      select: {
        date: true,
        type: true,
        discipline: true,
        distanceMeters: true,
        score: true,
        arrowCount: true,
      },
    });
    const sessions: ProgressSession[] = rows.map((s) => ({ ...s, date: fromDbDate(s.date) }));
    for (const goal of figured) {
      const { value, reachedOn } = goalProgress(
        {
          metric: goal.metric!,
          target: goal.target!,
          createdOn: fromDbDate(goal.createdOn),
          discipline: goal.discipline,
          distanceMeters: goal.distanceMeters,
        },
        sessions,
        today,
      );
      progress.set(goal.id, value);
      if (goal.achievedOn === null && reachedOn) {
        goal.achievedOn = toDbDate(reachedOn);
        await this.prisma.goal.update({
          where: { id: goal.id },
          data: { achievedOn: goal.achievedOn },
        });
      }
    }
    return progress;
  }

  private async findOwned(userId: string, id: string): Promise<Goal> {
    const goal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Goal not found');
    return goal;
  }
}

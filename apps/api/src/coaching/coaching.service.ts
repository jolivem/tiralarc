import { ForbiddenException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import { CompetitionsService } from '../competitions/competitions.service.js';
import type { CompetitionListDto } from '../competitions/dto/competition.dto.js';
import { CoachAccess, type ProfileInvitation } from '../generated/prisma/client.js';
import type { GoalDto } from '../goals/dto/goal.dto.js';
import { GoalsService } from '../goals/goals.service.js';
import type {
  CustomEventTypeDto,
  JournalDto,
  JournalStatsDto,
  PhotoDto,
  SessionDto,
  SessionSuggestionsDto,
  SessionSummaryDto,
} from '../journal/dto/journal.dto.js';
import { EventTypesService } from '../journal/event-types.service.js';
import { JournalService } from '../journal/journal.service.js';
import { PhotosService } from '../journal/photos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProfileService } from '../profile/profile.service.js';
import type {
  AthleteDto,
  CoachGroupDto,
  PlanSessionDto,
  SaveCoachGroupDto,
  UpdatePlannedSessionDto,
} from './dto/coaching.dto.js';

export const MAX_COACH_GROUPS = 30;

const NO_STATS: JournalStatsDto = {
  competitions: [],
  scores: [],
  arrowsByDay: [],
  durationsByDay: [],
  eventsByDay: [],
  physicalFeelingsByDay: [],
  mentalFeelingsByDay: [],
};

/** Today's calendar day (YYYY-MM-DD, UTC, like the DATE columns). */
const today = () => new Date().toISOString().slice(0, 10);

type Link = ProfileInvitation & {
  user: { displayName: string | null; email: string };
  coachGroup: CoachGroupDto | null;
};
const LINK_DETAILS = {
  user: { select: { displayName: true, email: true } },
  coachGroup: { select: { id: true, name: true } },
} as const;

/**
 * The coach's side of the journal. An archer's coach (the account that accepted their coach
 * invitation) sees the journal of the season in progress — the one whose period covers today —
 * with its events, sheets and photos, the indicators over its period and the archer's goals.
 * With WRITE access, they also plan events after today and may change or delete the ones they
 * planned while those are still to come. Anyone else gets a 404, as for another archer's data.
 */
@Injectable()
export class CoachingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journal: JournalService,
    private readonly eventTypes: EventTypesService,
    private readonly photos: PhotosService,
    private readonly goals: GoalsService,
    private readonly profile: ProfileService,
    private readonly competitions: CompetitionsService,
  ) {}

  /** The archers the user coaches, by name. */
  async athletes(coachId: string): Promise<AthleteDto[]> {
    const links = await this.prisma.profileInvitation.findMany({
      where: { coachId },
      include: LINK_DETAILS,
    });
    const athletes = await Promise.all(links.map((link) => this.toAthleteDto(link)));
    return athletes.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  async athlete(coachId: string, archerId: string): Promise<AthleteDto> {
    return this.toAthleteDto(await this.link(coachId, archerId));
  }

  // ----------------------------------------------------------------- groups

  async groups(coachId: string): Promise<CoachGroupDto[]> {
    const groups = await this.prisma.coachGroup.findMany({
      where: { coachId },
      select: { id: true, name: true },
    });
    return groups.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  async createGroup(coachId: string, dto: SaveCoachGroupDto): Promise<CoachGroupDto> {
    const name = dto.name.trim();
    if ((await this.prisma.coachGroup.count({ where: { coachId } })) >= MAX_COACH_GROUPS) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.LIMIT_REACHED,
        `At most ${MAX_COACH_GROUPS} groups per coach`,
      );
    }
    await this.assertNameFree(coachId, name);
    return this.prisma.coachGroup.create({
      data: { coachId, name },
      select: { id: true, name: true },
    });
  }

  async renameGroup(coachId: string, id: string, dto: SaveCoachGroupDto): Promise<CoachGroupDto> {
    await this.ownGroup(coachId, id);
    const name = dto.name.trim();
    await this.assertNameFree(coachId, name, id);
    return this.prisma.coachGroup.update({
      where: { id },
      data: { name },
      select: { id: true, name: true },
    });
  }

  /** Its archers stay followed, in no group. */
  async removeGroup(coachId: string, id: string): Promise<void> {
    await this.ownGroup(coachId, id);
    await this.prisma.coachGroup.delete({ where: { id } });
  }

  async setAthleteGroup(
    coachId: string,
    archerId: string,
    groupId: string | null,
  ): Promise<AthleteDto> {
    const link = await this.link(coachId, archerId);
    if (groupId) await this.ownGroup(coachId, groupId);
    const updated = await this.prisma.profileInvitation.update({
      where: { id: link.id },
      data: { coachGroupId: groupId },
      include: LINK_DETAILS,
    });
    return this.toAthleteDto(updated);
  }

  private async ownGroup(coachId: string, id: string): Promise<void> {
    if (!(await this.prisma.coachGroup.findFirst({ where: { id, coachId } }))) {
      throw new NotFoundException('Group not found');
    }
  }

  private async assertNameFree(coachId: string, name: string, ownId?: string): Promise<void> {
    const same = await this.prisma.coachGroup.findFirst({
      where: { coachId, name, ...(ownId && { id: { not: ownId } }) },
    });
    if (same) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.GROUP_NAME_TAKEN,
        'You already have a group with this name',
      );
    }
  }

  /** The events of the current journal between two days (clipped to its period). */
  async sessions(
    coachId: string,
    archerId: string,
    from: string,
    to: string,
  ): Promise<SessionSummaryDto[]> {
    const journal = await this.currentJournal(coachId, archerId);
    const range = journal && clip(journal, from, to);
    return range ? this.journal.list(archerId, range.from, range.to) : [];
  }

  /** The indicators' figures over the current journal's period (or the part asked for). */
  async stats(
    coachId: string,
    archerId: string,
    from?: string,
    to?: string,
  ): Promise<JournalStatsDto> {
    const journal = await this.currentJournal(coachId, archerId);
    const range = journal && clip(journal, from ?? journal.startDate, to ?? journal.endDate);
    return range ? this.journal.stats(archerId, range.from, range.to) : NO_STATS;
  }

  /**
   * The FFTA competitions the archer sees (their departments and disciplines), within the
   * current journal's period: what the coach may add to it.
   */
  async competitionList(
    coachId: string,
    archerId: string,
    from?: string,
    to?: string,
  ): Promise<CompetitionListDto> {
    const journal = await this.currentJournal(coachId, archerId);
    const range = journal && clip(journal, from ?? today(), to ?? journal.endDate);
    const list = await this.competitions.list(archerId, range?.from, range?.to);
    if (!range) list.competitions = [];
    return list;
  }

  async suggestions(coachId: string, archerId: string): Promise<SessionSuggestionsDto> {
    await this.link(coachId, archerId);
    return this.journal.suggestions(archerId);
  }

  async customTypes(coachId: string, archerId: string): Promise<CustomEventTypeDto[]> {
    await this.link(coachId, archerId);
    return this.eventTypes.list(archerId);
  }

  async goalList(coachId: string, archerId: string): Promise<GoalDto[]> {
    await this.link(coachId, archerId);
    return this.goals.list(archerId);
  }

  /** An event of the current journal (any other is a 404). */
  async session(coachId: string, archerId: string, id: string): Promise<SessionDto> {
    const journal = await this.currentJournal(coachId, archerId);
    const session = await this.journal.get(archerId, id);
    if (!journal || session.date < journal.startDate || session.date > journal.endDate) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async sessionPhotos(coachId: string, archerId: string, id: string): Promise<PhotoDto[]> {
    await this.session(coachId, archerId, id);
    return this.photos.list(archerId, id);
  }

  async sessionScoreSheet(coachId: string, archerId: string, id: string): Promise<Uint8Array> {
    await this.session(coachId, archerId, id);
    return this.journal.scoreSheet(archerId, id);
  }

  async plan(coachId: string, archerId: string, dto: PlanSessionDto): Promise<SessionDto> {
    const link = await this.link(coachId, archerId);
    assertWrite(link);
    await this.assertPlannable(archerId, dto.date);
    const { type, ...fields } = dto;
    return this.journal.plan(archerId, coachId, type, fields);
  }

  async updatePlanned(
    coachId: string,
    archerId: string,
    id: string,
    dto: UpdatePlannedSessionDto,
  ): Promise<SessionDto> {
    await this.findPlanned(coachId, archerId, id);
    if (dto.date !== undefined) await this.assertPlannable(archerId, dto.date);
    return this.journal.update(archerId, id, dto);
  }

  async removePlanned(coachId: string, archerId: string, id: string): Promise<void> {
    await this.findPlanned(coachId, archerId, id);
    await this.journal.remove(archerId, id);
  }

  /** An event the coach planned, still to come, with WRITE access. */
  private async findPlanned(coachId: string, archerId: string, id: string): Promise<SessionDto> {
    assertWrite(await this.link(coachId, archerId));
    const session = await this.session(coachId, archerId, id);
    if (session.plannedBy?.id !== coachId) {
      throw new ForbiddenException('Only the events you planned can be changed');
    }
    if (session.date <= today()) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        ErrorCode.DATE_NOT_PLANNABLE,
        'The event is no longer to come',
      );
    }
    return session;
  }

  /** A day after today, within the journal of the season in progress. */
  private async assertPlannable(archerId: string, date: string): Promise<void> {
    const journal = await this.journal.journalOn(archerId, today());
    if (!journal || date <= today() || date > journal.endDate) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.DATE_NOT_PLANNABLE,
        "A coach plans days after today, within the archer's journal of the season in progress",
      );
    }
  }

  private async currentJournal(coachId: string, archerId: string): Promise<JournalDto | null> {
    await this.link(coachId, archerId);
    return this.journal.journalOn(archerId, today());
  }

  private async link(coachId: string, archerId: string): Promise<Link> {
    const link = await this.prisma.profileInvitation.findFirst({
      where: { userId: archerId, coachId },
      include: LINK_DETAILS,
    });
    if (!link) throw new NotFoundException('Archer not found');
    return link;
  }

  private async toAthleteDto(link: Link): Promise<AthleteDto> {
    const [journal, profile] = await Promise.all([
      this.journal.journalOn(link.userId, today()),
      this.profile.get(link.userId),
    ]);
    return {
      id: link.userId,
      name: link.user.displayName ?? link.user.email,
      access: link.coachAccess ?? CoachAccess.READ,
      journal,
      disciplines: profile.disciplines,
      group: link.coachGroup,
    };
  }
}

function assertWrite(link: Link): void {
  if (link.coachAccess !== CoachAccess.WRITE) {
    throw new ForbiddenException('Your access to this journal is read-only');
  }
}

/** The part of [from, to] within the journal's period; null when they don't meet. */
function clip(journal: JournalDto, from: string, to: string): { from: string; to: string } | null {
  const start = from > journal.startDate ? from : journal.startDate;
  const end = to < journal.endDate ? to : journal.endDate;
  return start <= end ? { from: start, to: end } : null;
}

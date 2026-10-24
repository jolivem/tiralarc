import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { CompetitionListDto, ListCompetitionsQuery } from '../competitions/dto/competition.dto.js';
import { GoalDto } from '../goals/dto/goal.dto.js';
import {
  CustomEventTypeDto,
  JournalStatsDto,
  ListSessionsQuery,
  PhotoDto,
  SessionDto,
  SessionSuggestionsDto,
  SessionSummaryDto,
  StatsQuery,
} from '../journal/dto/journal.dto.js';
import { AthleteDto, PlanSessionDto, UpdatePlannedSessionDto } from './dto/coaching.dto.js';
import { CoachingService } from './coaching.service.js';

const ARCHER_ID = 'archerId';

/**
 * The coach's view of their archers' journals. No role required: access comes from the
 * archer's accepted coach invitation (an archer someone doesn't coach is a 404).
 */
@ApiTags('coaching')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'Not one of your archers (or not in their current journal)' })
@Controller('coach/athletes')
export class CoachingController {
  constructor(private readonly coaching: CoachingService) {}

  @Get()
  @ApiOperation({ summary: 'The archers who made you their coach, with their current journal' })
  @ApiOkResponse({ type: AthleteDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<AthleteDto[]> {
    return this.coaching.athletes(user.id);
  }

  @Get(':archerId')
  @ApiOkResponse({ type: AthleteDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
  ): Promise<AthleteDto> {
    return this.coaching.athlete(user.id, archerId);
  }

  @Get(':archerId/sessions')
  @ApiOperation({ summary: 'Events of the current journal between two days (clipped to it)' })
  @ApiOkResponse({ type: SessionSummaryDto, isArray: true })
  sessions(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Query() query: ListSessionsQuery,
  ): Promise<SessionSummaryDto[]> {
    return this.coaching.sessions(user.id, archerId, query.from, query.to);
  }

  /** Declared before ':id' so "stats" isn't parsed as an id. */
  @Get(':archerId/sessions/stats')
  @ApiOperation({
    summary: "Figures behind the archer's indicators, over the current journal's period",
  })
  @ApiOkResponse({ type: JournalStatsDto })
  stats(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Query() query: StatsQuery,
  ): Promise<JournalStatsDto> {
    return this.coaching.stats(user.id, archerId, query.from, query.to);
  }

  @Get(':archerId/sessions/suggestions')
  @ApiOkResponse({ type: SessionSuggestionsDto })
  suggestions(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
  ): Promise<SessionSuggestionsDto> {
    return this.coaching.suggestions(user.id, archerId);
  }

  @Post(':archerId/sessions')
  @ApiOperation({
    summary: 'Plan a training, coaching, competition or strength session (WRITE access)',
  })
  @ApiCreatedResponse({ type: SessionDto })
  @ApiBadRequestResponse({ description: 'DATE_NOT_PLANNABLE' })
  @ApiForbiddenResponse({ description: 'Read-only access' })
  @ApiConflictResponse({
    description: 'DAY_FULL, LIMIT_REACHED (an FFTA competition twice that day)',
  })
  plan(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Body() dto: PlanSessionDto,
  ): Promise<SessionDto> {
    return this.coaching.plan(user.id, archerId, dto);
  }

  @Get(':archerId/sessions/:id')
  @ApiOkResponse({ type: SessionDto })
  session(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SessionDto> {
    return this.coaching.session(user.id, archerId, id);
  }

  @Patch(':archerId/sessions/:id')
  @ApiOperation({ summary: 'Change the planning of an event you planned, still to come' })
  @ApiOkResponse({ type: SessionDto })
  @ApiBadRequestResponse({ description: 'DATE_NOT_PLANNABLE' })
  @ApiForbiddenResponse({ description: 'Read-only access, or an event you did not plan' })
  @ApiConflictResponse({ description: 'DATE_NOT_PLANNABLE (the event is past), DAY_FULL' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePlannedSessionDto,
  ): Promise<SessionDto> {
    return this.coaching.updatePlanned(user.id, archerId, id, dto);
  }

  @Delete(':archerId/sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event you planned, still to come' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Read-only access, or an event you did not plan' })
  @ApiConflictResponse({ description: 'DATE_NOT_PLANNABLE: the event is past' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.coaching.removePlanned(user.id, archerId, id);
  }

  @Get(':archerId/sessions/:id/photos')
  @ApiOperation({ summary: 'Photos of an event; the URLs are signed and expire after 10 minutes' })
  @ApiOkResponse({ type: PhotoDto, isArray: true })
  photos(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<PhotoDto[]> {
    return this.coaching.sessionPhotos(user.id, archerId, id);
  }

  @Get(':archerId/competitions')
  @ApiOperation({
    summary:
      "Upcoming FFTA competitions of the archer's department and disciplines, within the " +
      'current journal (WRITE access adds them with POST .../sessions and `fftaCompetitionId`)',
  })
  @ApiOkResponse({ type: CompetitionListDto })
  competitions(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Query() query: ListCompetitionsQuery,
  ): Promise<CompetitionListDto> {
    return this.coaching.competitionList(user.id, archerId, query.from, query.to);
  }

  @Get(':archerId/event-types')
  @ApiOperation({ summary: "The archer's own event types (for the legend)" })
  @ApiOkResponse({ type: CustomEventTypeDto, isArray: true })
  eventTypes(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
  ): Promise<CustomEventTypeDto[]> {
    return this.coaching.customTypes(user.id, archerId);
  }

  @Get(':archerId/goals')
  @ApiOkResponse({ type: GoalDto, isArray: true })
  goals(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
  ): Promise<GoalDto[]> {
    return this.coaching.goalList(user.id, archerId);
  }
}

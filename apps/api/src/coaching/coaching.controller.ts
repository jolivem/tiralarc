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
  Put,
  Query,
  StreamableFile,
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
  ApiProduces,
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
  SaveSessionCommentDto,
  SessionCommentDto,
  SessionDto,
  SessionSuggestionsDto,
  SessionSummaryDto,
  StatsQuery,
} from '../journal/dto/journal.dto.js';
import {
  AthleteDto,
  CoachGroupDto,
  PlanSessionDto,
  SaveCoachGroupDto,
  SetAthleteGroupDto,
  UpdatePlannedSessionDto,
} from './dto/coaching.dto.js';
import { CoachingService } from './coaching.service.js';

const ARCHER_ID = 'archerId';

/** The groups a coach sorts their archers into: their own, unseen by the archers. */
@ApiTags('coaching')
@ApiBearerAuth()
@Controller('coach/groups')
export class CoachGroupsController {
  constructor(private readonly coaching: CoachingService) {}

  @Get()
  @ApiOperation({ summary: 'Your groups of archers, by name' })
  @ApiOkResponse({ type: CoachGroupDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<CoachGroupDto[]> {
    return this.coaching.groups(user.id);
  }

  @Post()
  @ApiCreatedResponse({ type: CoachGroupDto })
  @ApiConflictResponse({ description: 'GROUP_NAME_TAKEN, LIMIT_REACHED' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveCoachGroupDto,
  ): Promise<CoachGroupDto> {
    return this.coaching.createGroup(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename a group' })
  @ApiOkResponse({ type: CoachGroupDto })
  @ApiConflictResponse({ description: 'GROUP_NAME_TAKEN' })
  @ApiNotFoundResponse()
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveCoachGroupDto,
  ): Promise<CoachGroupDto> {
    return this.coaching.renameGroup(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a group; its archers stay followed, in no group' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.coaching.removeGroup(user.id, id);
  }
}

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

  @Put(':archerId/group')
  @ApiOperation({ summary: 'Put the archer in one of your groups, or take them out' })
  @ApiOkResponse({ type: AthleteDto })
  setGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Body() dto: SetAthleteGroupDto,
  ): Promise<AthleteDto> {
    return this.coaching.setAthleteGroup(user.id, archerId, dto.groupId ?? null);
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

  @Get(':archerId/sessions/:id/comments')
  @ApiOperation({ summary: "The comments left on the event by the archer's coaches, oldest first" })
  @ApiOkResponse({ type: SessionCommentDto, isArray: true })
  comments(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SessionCommentDto[]> {
    return this.coaching.comments(user.id, archerId, id);
  }

  @Post(':archerId/sessions/:id/comments')
  @ApiOperation({
    summary:
      'Comment on the event (READ or WRITE access): new to the archer until they open its sheet',
  })
  @ApiCreatedResponse({ type: SessionCommentDto })
  @ApiConflictResponse({
    description: 'LIMIT_REACHED: this coach already commented on the event (change it instead)',
  })
  addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveSessionCommentDto,
  ): Promise<SessionCommentDto> {
    return this.coaching.addComment(user.id, archerId, id, dto.text);
  }

  @Patch(':archerId/sessions/:id/comments/:commentId')
  @ApiOperation({ summary: 'Change a comment you wrote: new again to the archer' })
  @ApiOkResponse({ type: SessionCommentDto })
  @ApiForbiddenResponse({ description: 'Another coach’s comment' })
  updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: SaveSessionCommentDto,
  ): Promise<SessionCommentDto> {
    return this.coaching.updateComment(user.id, archerId, id, commentId, dto.text);
  }

  @Delete(':archerId/sessions/:id/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment you wrote' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Another coach’s comment' })
  removeComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
  ): Promise<void> {
    return this.coaching.removeComment(user.id, archerId, id, commentId);
  }

  @Get(':archerId/sessions/:id/score-sheet')
  @ApiOperation({ summary: "The archer's score sheet at this competition (`hasScoreSheet`)" })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async scoreSheet(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ARCHER_ID, new ParseUUIDPipe()) archerId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.coaching.sessionScoreSheet(user.id, archerId, id), {
      type: 'application/pdf',
    });
  }

  @Get(':archerId/competitions')
  @ApiOperation({
    summary:
      "Upcoming FFTA competitions of the archer's departments and disciplines, within the " +
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

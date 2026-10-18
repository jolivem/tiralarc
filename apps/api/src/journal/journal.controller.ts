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
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import {
  CreateSessionDto,
  JournalStatsDto,
  ListSessionsQuery,
  NewEventDto,
  SessionDto,
  SessionSuggestionsDto,
  SessionSummaryDto,
  StatsQuery,
  UpdateSessionDto,
} from './dto/journal.dto.js';
import { JournalService } from './journal.service.js';

@ApiTags('journal')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@Roles(Role.ARCHER)
@Controller('journal/sessions')
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Get()
  @ApiOkResponse({ type: SessionSummaryDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSessionsQuery,
  ): Promise<SessionSummaryDto[]> {
    return this.journal.list(user.id, query.from, query.to);
  }

  /** Declared before ':id' so "stats" isn't parsed as an id. */
  @Get('stats')
  @ApiOperation({
    summary:
      "Figures behind the archer's indicators (competitions, arrows per day), over a period or all time",
  })
  @ApiOkResponse({ type: JournalStatsDto })
  stats(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StatsQuery,
  ): Promise<JournalStatsDto> {
    return this.journal.stats(user.id, query.from, query.to);
  }

  /** Declared before ':id' so "suggestions" isn't parsed as an id. */
  @Get('suggestions')
  @ApiOkResponse({ type: SessionSuggestionsDto })
  suggestions(@CurrentUser() user: AuthenticatedUser): Promise<SessionSuggestionsDto> {
    return this.journal.suggestions(user.id);
  }

  /** Declared before ':id' so "new" isn't parsed as an id. */
  @Get('new')
  @ApiOperation({
    summary: "Events the archer's coach planned that the archer hasn't opened yet",
  })
  @ApiOkResponse({ type: NewEventDto, isArray: true })
  newEvents(@CurrentUser() user: AuthenticatedUser): Promise<NewEventDto[]> {
    return this.journal.newEvents(user.id);
  }

  @Post()
  @ApiCreatedResponse({ type: SessionDto })
  @ApiConflictResponse({ description: 'DAY_FULL: that day already has 4 events' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionDto> {
    return this.journal.create(user.id, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: SessionDto })
  @ApiNotFoundResponse()
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SessionDto> {
    return this.journal.get(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SessionDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'DAY_FULL: moved to a day that already has 4 events' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSessionDto,
  ): Promise<SessionDto> {
    return this.journal.update(user.id, id, dto);
  }

  @Post(':id/seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Tell that the archer opened the sheet (clients call it when they show it): a coach-planned event is then no longer new',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  markSeen(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.journal.markSeen(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.journal.remove(user.id, id);
  }
}

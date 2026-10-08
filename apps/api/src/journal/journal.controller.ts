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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
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
  ListSessionsQuery,
  SessionDto,
  SessionSuggestionsDto,
  SessionSummaryDto,
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
    return this.journal.list(user.id, query.journalId, query.from, query.to);
  }

  /** Declared before ':id' so "suggestions" isn't parsed as an id. */
  @Get('suggestions')
  @ApiOkResponse({ type: SessionSuggestionsDto })
  suggestions(@CurrentUser() user: AuthenticatedUser): Promise<SessionSuggestionsDto> {
    return this.journal.suggestions(user.id);
  }

  @Post()
  @ApiCreatedResponse({ type: SessionDto })
  @ApiNotFoundResponse({ description: 'Unknown journal' })
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
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSessionDto,
  ): Promise<SessionDto> {
    return this.journal.update(user.id, id, dto);
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

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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CreateJournalDto, JournalDto, UpdateJournalDto } from './dto/journal.dto.js';
import { JournalService } from './journal.service.js';

@ApiTags('journal')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@Roles(Role.ARCHER)
@Controller('journals')
export class JournalsController {
  constructor(private readonly journal: JournalService) {}

  @Get()
  @ApiOkResponse({ type: JournalDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<JournalDto[]> {
    return this.journal.listJournals(user.id);
  }

  @Post()
  @ApiCreatedResponse({ type: JournalDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJournalDto,
  ): Promise<JournalDto> {
    return this.journal.createJournal(user.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: JournalDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Sessions would fall outside the new period' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateJournalDto,
  ): Promise<JournalDto> {
    return this.journal.updateJournal(user.id, id, dto);
  }

  /** Also deletes the journal's sessions. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.journal.removeJournal(user.id, id);
  }
}

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
  CreateSheetDto,
  SheetDto,
  SheetSummaryDto,
  SheetTemplateDto,
  SheetTemplatesQuery,
  UpdateSheetDto,
} from './dto/sheet.dto.js';
import { SheetTemplatesService } from './sheet-templates.service.js';
import { SheetsService } from './sheets.service.js';

/** The archer's binder: technique, settings, strength and mental preparation sheets. */
@ApiTags('sheets')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@Roles(Role.ARCHER)
@Controller('sheets')
export class SheetsController {
  constructor(
    private readonly sheets: SheetsService,
    private readonly sheetTemplates: SheetTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Every sheet, without its text (the indexes), by title' })
  @ApiOkResponse({ type: SheetSummaryDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<SheetSummaryDto[]> {
    return this.sheets.list(user.id);
  }

  /** Declared before ':id' so "all" isn't parsed as an id. */
  @Get('all')
  @ApiOperation({ summary: 'Every sheet with its text, oldest first (e.g. to print them)' })
  @ApiOkResponse({ type: SheetDto, isArray: true })
  all(@CurrentUser() user: AuthenticatedUser): Promise<SheetDto[]> {
    return this.sheets.all(user.id);
  }

  @Get('templates')
  @ApiOperation({
    summary:
      'Ready-made sheets to start from when adding one (e.g. "My string" in SETTINGS), by category',
  })
  @ApiOkResponse({ type: SheetTemplateDto, isArray: true })
  templates(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SheetTemplatesQuery,
  ): Promise<SheetTemplateDto[]> {
    return this.sheetTemplates.offered(user.id, query.category, query.locale);
  }

  @Post()
  @ApiCreatedResponse({ type: SheetDto })
  @ApiConflictResponse({ description: 'LIMIT_REACHED: 100 sheets in that category' })
  @ApiNotFoundResponse({ description: 'No such template in that category' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSheetDto): Promise<SheetDto> {
    return this.sheets.create(user.id, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: SheetDto })
  @ApiNotFoundResponse()
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<SheetDto> {
    return this.sheets.get(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SheetDto })
  @ApiNotFoundResponse()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSheetDto,
  ): Promise<SheetDto> {
    return this.sheets.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.sheets.remove(user.id, id);
  }
}

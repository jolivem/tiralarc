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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import {
  AdminSheetTemplateDto,
  CreateSheetTemplateDto,
  MoveSheetTemplateDto,
  UpdateSheetTemplateDto,
} from './dto/sheet-template.dto.js';
import { SheetTemplatesService } from './sheet-templates.service.js';

/**
 * The admins' side of the sheet templates: written in both languages, ordered within their
 * category, hidden from the archers while not ready.
 */
@ApiTags('admin')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Admins only' })
@Roles(Role.ADMIN)
@Controller('admin/sheet-templates')
export class SheetTemplatesController {
  constructor(private readonly templates: SheetTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Every template, hidden ones too, by category then in their order' })
  @ApiOkResponse({ type: AdminSheetTemplateDto, isArray: true })
  list(): Promise<AdminSheetTemplateDto[]> {
    return this.templates.list();
  }

  @Post()
  @ApiOperation({ summary: 'A new template, at the end of its category' })
  @ApiCreatedResponse({ type: AdminSheetTemplateDto })
  create(@Body() dto: CreateSheetTemplateDto): Promise<AdminSheetTemplateDto> {
    return this.templates.create(dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: AdminSheetTemplateDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSheetTemplateDto,
  ): Promise<AdminSheetTemplateDto> {
    return this.templates.update(id, dto);
  }

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'One place up or down in its category; every template comes back' })
  @ApiOkResponse({ type: AdminSheetTemplateDto, isArray: true })
  @ApiNotFoundResponse()
  move(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: MoveSheetTemplateDto,
  ): Promise<AdminSheetTemplateDto[]> {
    return this.templates.move(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template; the sheets started from it keep their text' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.templates.remove(id);
  }
}

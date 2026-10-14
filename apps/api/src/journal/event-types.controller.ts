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
  CreateCustomEventTypeDto,
  CustomEventTypeDto,
  UpdateCustomEventTypeDto,
} from './dto/journal.dto.js';
import { EventTypesService } from './event-types.service.js';

@ApiTags('journal')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@Roles(Role.ARCHER)
@Controller('journal/event-types')
export class EventTypesController {
  constructor(private readonly types: EventTypesService) {}

  @Get()
  @ApiOperation({ summary: "The archer's own event types (`CUSTOM` events), oldest first" })
  @ApiOkResponse({ type: CustomEventTypeDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<CustomEventTypeDto[]> {
    return this.types.list(user.id);
  }

  @Post()
  @ApiCreatedResponse({ type: CustomEventTypeDto })
  @ApiConflictResponse({ description: 'LIMIT_REACHED: the archer already has 4 event types' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomEventTypeDto,
  ): Promise<CustomEventTypeDto> {
    return this.types.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CustomEventTypeDto })
  @ApiNotFoundResponse()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomEventTypeDto,
  ): Promise<CustomEventTypeDto> {
    return this.types.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Deletes an event type; its events become `OTHER` events with its title, colour and pictogram',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.types.remove(user.id, id);
  }
}

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
import { CreateGoalDto, GoalDto, UpdateGoalDto } from './dto/goal.dto.js';
import { GoalsService } from './goals.service.js';

@ApiTags('goals')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@Roles(Role.ARCHER)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  @ApiOkResponse({ type: GoalDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<GoalDto[]> {
    return this.goals.list(user.id);
  }

  @Post()
  @ApiCreatedResponse({ type: GoalDto })
  @ApiConflictResponse({ description: 'LIMIT_REACHED' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGoalDto): Promise<GoalDto> {
    return this.goals.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: GoalDto })
  @ApiNotFoundResponse()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<GoalDto> {
    return this.goals.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.goals.remove(user.id, id);
  }
}

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { CompetitionsService } from './competitions.service.js';
import {
  CompetitionListDto,
  CompetitionResultsDto,
  DepartmentDto,
  ListCompetitionsQuery,
} from './dto/competition.dto.js';

/** An FFTA competition id from the path: a number (anything else is a 404). */
function fftaId(id: string): string {
  if (!/^\d{1,20}$/.test(id)) throw new NotFoundException('Competition not found');
  return id;
}

@ApiTags('competitions')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@Roles(Role.ARCHER)
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitions: CompetitionsService) {}

  @Get()
  @ApiOperation({
    summary:
      "Upcoming FFTA competitions of the archer's departments, in their disciplines (profile)",
    description:
      'Read from the FFTA website and kept for a few hours. With `paraCompetitions` in the ' +
      'profile, the para-archery indoor and outdoor competitions are included.',
  })
  @ApiOkResponse({ type: CompetitionListDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCompetitionsQuery,
  ): Promise<CompetitionListDto> {
    return this.competitions.list(user.id, query.from, query.to);
  }

  @Get(':id/results')
  @ApiOperation({
    summary: "An FFTA competition's results, once its organiser published them",
    description:
      'For an event added from the FFTA calendar (`fftaCompetitionId`). Read from the ' +
      "competition's page on the FFTA website.",
  })
  @ApiOkResponse({ type: CompetitionResultsDto })
  @ApiNotFoundResponse({ description: 'Not an FFTA competition id' })
  results(@Param('id') id: string): Promise<CompetitionResultsDto> {
    return this.competitions.results(fftaId(id));
  }

  @Put(':id/dismissal')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'The archer will not take part: out of their competitions to plan',
    description: 'The calendars still show it (`dismissed` in the list). Idempotent.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Not an FFTA competition id' })
  async dismiss(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.competitions.dismiss(user.id, fftaId(id));
  }

  @Delete(':id/dismissal')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Back among the competitions to plan. Idempotent.' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Not an FFTA competition id' })
  async undismiss(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.competitions.undismiss(user.id, fftaId(id));
  }

  @Get('departments')
  @ApiOperation({ summary: 'The departments an archer can pick in their profile' })
  @ApiOkResponse({ type: DepartmentDto, isArray: true })
  departments(): DepartmentDto[] {
    return this.competitions.departments();
  }
}

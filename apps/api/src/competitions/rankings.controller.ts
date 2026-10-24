import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
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
import { RankingListDto } from './dto/ranking.dto.js';
import { RankingsService } from './rankings.service.js';

@ApiTags('competitions')
@ApiBearerAuth()
@ApiForbiddenResponse({ description: 'Archers only' })
@Roles(Role.ARCHER)
@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankings: RankingsService) {}

  @Get()
  @ApiOperation({
    summary: "The archer's places in the FFTA national rankings",
    description:
      'The rankings of their category and bow (profile), in their disciplines, that list their ' +
      'licence number; read from the FFTA website and kept a few hours.',
  })
  @ApiOkResponse({ type: RankingListDto })
  list(@CurrentUser() user: AuthenticatedUser): Promise<RankingListDto> {
    return this.rankings.list(user.id);
  }
}

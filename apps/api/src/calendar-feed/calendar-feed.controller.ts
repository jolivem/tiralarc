import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CalendarFeedService } from './calendar-feed.service.js';

export class CalendarFeedDto {
  @ApiProperty({
    format: 'uri',
    description:
      'The subscription link (iCal), to add to a calendar app. Shown only now: keep it secret, ' +
      'anyone with it sees the events. A new one replaces it.',
  })
  url!: string;
}

/** The link's secret, then ".ics". */
const FEED_FILE = /^([\w-]{20,100})\.ics$/;

@ApiTags('profile')
@Controller()
export class CalendarFeedController {
  constructor(private readonly feed: CalendarFeedService) {}

  @Post('profile/calendar-feed')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Creates the archer's calendar subscription link (replacing the previous one)",
  })
  @ApiCreatedResponse({ type: CalendarFeedDto })
  async create(@CurrentUser() user: AuthenticatedUser): Promise<CalendarFeedDto> {
    return { url: await this.feed.create(user.id) };
  }

  @Delete('profile/calendar-feed')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Turns the calendar subscription link off' })
  @ApiNoContentResponse()
  async remove(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.feed.remove(user.id);
  }

  @Get('calendar/:file')
  @Public()
  @ApiOperation({
    summary:
      "The archer's events as an iCalendar file (whole days), for calendar apps: the link of " +
      'POST /profile/calendar-feed, no sign-in.',
  })
  @ApiProduces('text/calendar')
  @ApiOkResponse({ schema: { type: 'string' } })
  @ApiNotFoundResponse({ description: 'Unknown or turned-off link' })
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'private, max-age=900')
  file(@Param('file') file: string): Promise<string> {
    const token = FEED_FILE.exec(file)?.[1];
    if (!token) throw new NotFoundException('Unknown calendar link');
    return this.feed.file(token);
  }
}

import { Module } from '@nestjs/common';
import { CalendarFeedController } from './calendar-feed.controller.js';
import { CalendarFeedService } from './calendar-feed.service.js';

/** The archer's events for calendar apps (iCal subscription link). */
@Module({
  controllers: [CalendarFeedController],
  providers: [CalendarFeedService],
})
export class CalendarFeedModule {}

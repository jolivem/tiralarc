import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

/** The archers' emails about their journal: coach news, competition reminders. */
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

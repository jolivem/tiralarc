import { Module } from '@nestjs/common';
import { GoalsModule } from '../goals/goals.module.js';
import { JournalModule } from '../journal/journal.module.js';
import { ProfileModule } from '../profile/profile.module.js';
import { CoachingController } from './coaching.controller.js';
import { CoachingService } from './coaching.service.js';

@Module({
  imports: [JournalModule, GoalsModule, ProfileModule],
  controllers: [CoachingController],
  providers: [CoachingService],
})
export class CoachingModule {}

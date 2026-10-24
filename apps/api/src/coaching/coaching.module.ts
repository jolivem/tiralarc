import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../competitions/competitions.module.js';
import { GoalsModule } from '../goals/goals.module.js';
import { JournalModule } from '../journal/journal.module.js';
import { ProfileModule } from '../profile/profile.module.js';
import { CoachingController } from './coaching.controller.js';
import { CoachingService } from './coaching.service.js';

@Module({
  imports: [JournalModule, GoalsModule, ProfileModule, CompetitionsModule],
  controllers: [CoachingController],
  providers: [CoachingService],
})
export class CoachingModule {}

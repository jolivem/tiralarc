import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module.js';
import { CompetitionsController } from './competitions.controller.js';
import { CompetitionsService } from './competitions.service.js';
import { FftaClient } from './ffta.client.js';
import { RankingsController } from './rankings.controller.js';
import { RankingsService } from './rankings.service.js';

/** What Tiralarc reads from the FFTA website: the competition calendar, the national rankings. */
@Module({
  imports: [ProfileModule],
  controllers: [CompetitionsController, RankingsController],
  providers: [CompetitionsService, RankingsService, FftaClient],
  // The coach's view of an archer's journal shows them too.
  exports: [CompetitionsService],
})
export class CompetitionsModule {}

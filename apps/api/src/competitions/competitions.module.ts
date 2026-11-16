import { Module } from '@nestjs/common';
import { GeocodingModule } from '../geocoding/geocoding.module.js';
import { ProfileModule } from '../profile/profile.module.js';
import { CompetitionsController } from './competitions.controller.js';
import { CompetitionsService } from './competitions.service.js';
import { FftaClient } from './ffta.client.js';
import { FftaWatch } from './ffta-watch.service.js';
import { RankingsController } from './rankings.controller.js';
import { RankingsService } from './rankings.service.js';

/** What Tiralarc reads from the FFTA website: the competition calendar, the national rankings. */
@Module({
  imports: [ProfileModule, GeocodingModule],
  controllers: [CompetitionsController, RankingsController],
  // FftaWatch: an alert email when the site's pages change layout (ffta-layout.ts).
  providers: [CompetitionsService, RankingsService, FftaClient, FftaWatch],
  // The coach's view of an archer's journal shows them too.
  exports: [CompetitionsService],
})
export class CompetitionsModule {}

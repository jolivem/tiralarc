import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../competitions/competitions.module.js';
import { EventTypesController } from './event-types.controller.js';
import { EventTypesService } from './event-types.service.js';
import { JournalController } from './journal.controller.js';
import { PhotosController } from './photos.controller.js';
import { PhotosService } from './photos.service.js';
import { JournalsController } from './journals.controller.js';
import { JournalService } from './journal.service.js';

@Module({
  // An event added from the FFTA calendar takes the competition's place from it.
  imports: [CompetitionsModule],
  controllers: [JournalsController, JournalController, EventTypesController, PhotosController],
  providers: [JournalService, EventTypesService, PhotosService],
  exports: [JournalService, EventTypesService, PhotosService],
})
export class JournalModule {}

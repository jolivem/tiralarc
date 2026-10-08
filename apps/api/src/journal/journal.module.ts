import { Module } from '@nestjs/common';
import { JournalController } from './journal.controller.js';
import { PhotosController } from './photos.controller.js';
import { PhotosService } from './photos.service.js';
import { JournalsController } from './journals.controller.js';
import { JournalService } from './journal.service.js';

@Module({
  controllers: [JournalsController, JournalController, PhotosController],
  providers: [JournalService, PhotosService],
})
export class JournalModule {}

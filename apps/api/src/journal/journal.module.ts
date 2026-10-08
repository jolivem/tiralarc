import { Module } from '@nestjs/common';
import { JournalController } from './journal.controller.js';
import { JournalsController } from './journals.controller.js';
import { JournalService } from './journal.service.js';

@Module({
  controllers: [JournalsController, JournalController],
  providers: [JournalService],
})
export class JournalModule {}

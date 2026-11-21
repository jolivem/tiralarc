import { Module } from '@nestjs/common';
import { JournalModule } from '../journal/journal.module.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

/** The account itself: deleting it, exporting its data (`/users/me`, `/users/me/export`). */
@Module({
  // The photos' files go with the account.
  imports: [JournalModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}

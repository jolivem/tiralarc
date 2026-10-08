import { Module } from '@nestjs/common';
import { InvitationsController, ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

@Module({
  controllers: [ProfileController, InvitationsController],
  providers: [ProfileService],
})
export class ProfileModule {}

import { Module } from '@nestjs/common';
import { GeocodingModule } from '../geocoding/geocoding.module.js';
import { InvitationsController, ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [GeocodingModule],
  controllers: [ProfileController, InvitationsController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}

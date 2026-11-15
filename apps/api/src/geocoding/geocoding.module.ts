import { Module } from '@nestjs/common';
import { AddressClient } from './address.client.js';
import { GeocoderService } from './geocoder.service.js';

/** French towns' coordinates: the competitions map, the archer's home town. */
@Module({
  providers: [GeocoderService, AddressClient],
  exports: [GeocoderService],
})
export class GeocodingModule {}

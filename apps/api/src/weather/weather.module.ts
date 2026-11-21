import { Module } from '@nestjs/common';
import { GeocodingModule } from '../geocoding/geocoding.module.js';
import { WeatherClient } from './weather.client.js';
import { WeatherController } from './weather.controller.js';
import { WeatherService } from './weather.service.js';

/** An event's weather, to fill in its sheet (Open-Meteo). */
@Module({
  imports: [GeocodingModule],
  controllers: [WeatherController],
  providers: [WeatherService, WeatherClient],
})
export class WeatherModule {}

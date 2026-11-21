import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ApiException, ErrorCode } from '../common/errors.js';
import { GeocoderService } from '../geocoding/geocoder.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { sheetWeather, weatherSource, type SheetWeather } from './weather.js';
import { WeatherClient } from './weather.client.js';

const unavailable = (detail: string) =>
  new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.WEATHER_UNAVAILABLE, detail);

/**
 * The weather of an event's day where it took place, to fill in its sheet: the event's place if
 * it is a French town (an FFTA competition's is), else the archer's home town (Profile page).
 * Only for a day already come.
 */
@Injectable()
export class WeatherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoder: GeocoderService,
    private readonly client: WeatherClient,
  ) {}

  async forSession(
    userId: string,
    sessionId: string,
    now = new Date(),
  ): Promise<SheetWeather & { place: string }> {
    const session = await this.prisma.journalSession.findFirst({
      where: { id: sessionId, userId },
      select: {
        date: true,
        location: true,
        user: {
          select: {
            archerProfile: { select: { homeTown: true, homeLatitude: true, homeLongitude: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    const day = session.date.toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    if (day > today) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.VALIDATION_FAILED,
        'The weather is noted once the day has come',
      );
    }
    const home = session.user.archerProfile;
    const atPlace = session.location ? await this.geocoder.locate(session.location) : null;
    const where = atPlace
      ? { ...atPlace, place: session.location! }
      : home?.homeTown && home.homeLatitude !== null && home.homeLongitude !== null
        ? { latitude: home.homeLatitude, longitude: home.homeLongitude, place: home.homeTown }
        : null;
    if (!where) throw unavailable('Neither the place nor the home town could be found on the map');
    const daily = await this.client.daily(
      weatherSource(day, today),
      where.latitude,
      where.longitude,
      day,
    );
    if (!daily) throw unavailable('The weather service could not be reached');
    return { ...sheetWeather(daily), place: where.place };
  }
}

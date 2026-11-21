import { Injectable } from '@nestjs/common';
import type { DailyWeather } from './weather.js';

const URLS = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  archive: 'https://archive-api.open-meteo.com/v1/archive',
};
const TIMEOUT_MS = 10_000;

interface OpenMeteoDaily {
  daily?: {
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
  };
}

/**
 * Open-Meteo (free, no key; https://open-meteo.com): a place's daily weather. Only the
 * coordinates of a town and a day are sent. e2e tests replace it (`FakeWeather`).
 */
@Injectable()
export class WeatherClient {
  /** That day's figures; undefined when the service can't be reached. */
  async daily(
    source: 'forecast' | 'archive',
    latitude: number,
    longitude: number,
    day: string,
  ): Promise<DailyWeather | undefined> {
    const url = new URL(URLS[source]);
    url.search = new URLSearchParams({
      latitude: latitude.toFixed(3),
      longitude: longitude.toFixed(3),
      daily: 'weather_code,temperature_2m_max,wind_speed_10m_max',
      start_date: day,
      end_date: day,
      timezone: 'auto',
    }).toString();
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'Tiralarc/1.0' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) return undefined;
      const { daily } = (await response.json()) as OpenMeteoDaily;
      return {
        code: daily?.weather_code?.[0] ?? null,
        temperatureMax: daily?.temperature_2m_max?.[0] ?? null,
        windMax: daily?.wind_speed_10m_max?.[0] ?? null,
      };
    } catch {
      return undefined;
    }
  }
}

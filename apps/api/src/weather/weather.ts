/**
 * A day's weather as the sheet notes it (sky, wind, temperature), from Open-Meteo's daily
 * figures: its WMO weather code, highest temperature and wind speed. Pure, unit-tested.
 */
import type { Sky, Wind } from '../generated/prisma/client.js';

export interface DailyWeather {
  /** WMO weather interpretation code (0 clear … 99 thunderstorm). */
  code: number | null;
  /** °C. */
  temperatureMax: number | null;
  /** km/h, at 10 m. */
  windMax: number | null;
}

export interface SheetWeather {
  sky: Sky | null;
  wind: Wind | null;
  temperatureC: number | null;
}

/** 0–1 clear, 2 partly cloudy, 3 / fog overcast, anything falling (drizzle, rain, snow…) rainy. */
export function skyOf(code: number | null): Sky | null {
  if (code === null) return null;
  if (code <= 1) return 'SUNNY';
  if (code === 2) return 'PARTLY_CLOUDY';
  if (code === 3 || code === 45 || code === 48) return 'CLOUDY';
  return 'RAINY';
}

/** Beaufort, roughly: calm to 1, light breeze to 3, moderate to 5, strong beyond. */
export function windOf(kmh: number | null): Wind | null {
  if (kmh === null) return null;
  if (kmh < 6) return 'CALM';
  if (kmh < 20) return 'LIGHT';
  if (kmh < 39) return 'MODERATE';
  return 'STRONG';
}

export function sheetWeather(daily: DailyWeather): SheetWeather {
  return {
    sky: skyOf(daily.code),
    wind: windOf(daily.windMax),
    temperatureC: daily.temperatureMax === null ? null : Math.round(daily.temperatureMax),
  };
}

/** Recent days come from the forecast service (the archive lags a few days behind). */
const RECENT_DAYS = 60;

/** Which of Open-Meteo's services has that day. */
export function weatherSource(day: string, today: string): 'forecast' | 'archive' {
  const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000;
  return age <= RECENT_DAYS ? 'forecast' : 'archive';
}

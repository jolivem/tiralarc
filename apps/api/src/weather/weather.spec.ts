import { describe, expect, it } from 'vitest';
import { sheetWeather, skyOf, weatherSource, windOf } from './weather.js';

describe('weather for the sheet', () => {
  it('reads the sky from the WMO code', () => {
    expect([0, 1, 2, 3, 45, 61, 80, 95].map(skyOf)).toEqual([
      'SUNNY',
      'SUNNY',
      'PARTLY_CLOUDY',
      'CLOUDY',
      'CLOUDY',
      'RAINY',
      'RAINY',
      'RAINY',
    ]);
    expect(skyOf(null)).toBeNull();
  });

  it('sorts the wind by force', () => {
    expect([0, 5.9, 12, 25, 40].map(windOf)).toEqual([
      'CALM',
      'CALM',
      'LIGHT',
      'MODERATE',
      'STRONG',
    ]);
  });

  it('rounds the temperature', () => {
    expect(sheetWeather({ code: 2, temperatureMax: 17.6, windMax: 14 })).toEqual({
      sky: 'PARTLY_CLOUDY',
      wind: 'LIGHT',
      temperatureC: 18,
    });
  });

  it('asks the forecast service for recent days, the archive for older ones', () => {
    expect(weatherSource('2026-11-20', '2026-11-21')).toBe('forecast');
    expect(weatherSource('2026-09-22', '2026-11-21')).toBe('forecast');
    expect(weatherSource('2026-06-01', '2026-11-21')).toBe('archive');
  });
});

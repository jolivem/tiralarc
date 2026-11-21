import { describe, expect, it } from 'vitest';
import { calendarFile, escapeText, fold } from './ics.js';

describe('iCalendar file', () => {
  it('writes each event as a whole day, its text escaped', () => {
    const file = calendarFile('MyArcheryDiary — Camille', [
      {
        id: 'abc',
        day: '2026-11-28',
        summary: 'Compétition · Concours de Rennes, 18 m',
        location: 'Rennes',
        description: 'Objectif : 550\nRester calme',
        updatedAt: new Date('2026-11-20T08:30:00.123Z'),
      },
    ]);
    expect(file.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(file.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(file).toContain('UID:abc@myarcherydiary\r\n');
    expect(file).toContain('DTSTAMP:20261120T083000Z\r\n');
    expect(file).toContain('DTSTART;VALUE=DATE:20261128\r\n');
    expect(file).toContain('DTEND;VALUE=DATE:20261129\r\n');
    expect(file).toContain('SUMMARY:Compétition · Concours de Rennes\\, 18 m\r\n');
    expect(file).toContain('DESCRIPTION:Objectif : 550\\nRester calme\r\n');
  });

  it('ends a month on the next one', () => {
    const file = calendarFile('x', [
      {
        id: 'a',
        day: '2027-02-28',
        summary: 's',
        location: null,
        description: null,
        updatedAt: new Date(0),
      },
    ]);
    expect(file).toContain('DTEND;VALUE=DATE:20270301');
    expect(file).not.toContain('LOCATION');
  });

  it('escapes and folds as the standard says', () => {
    expect(escapeText('a;b,c\\d')).toBe('a\\;b\\,c\\\\d');
    const long = `DESCRIPTION:${'é'.repeat(60)}`;
    const folded = fold(long);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    expect(lines.slice(1).every((line) => line.startsWith(' '))).toBe(true);
    expect(lines.map((line, i) => (i === 0 ? line : line.slice(1))).join('')).toBe(long);
  });
});

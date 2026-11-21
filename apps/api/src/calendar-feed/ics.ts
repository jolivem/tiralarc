/**
 * An iCalendar file (RFC 5545) of an archer's events, for calendar apps that subscribe to a link
 * (Google Agenda, the iPhone's, Outlook…). Each event is a whole day (they have no time). Pure,
 * unit-tested.
 */

export interface FeedEvent {
  id: string;
  /** "YYYY-MM-DD". */
  day: string;
  summary: string;
  location: string | null;
  description: string | null;
  updatedAt: Date;
}

/** Text values: backslashes, semicolons, commas and line breaks escaped. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 octets go on, each continuation starting with a space. */
export function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never in the middle of a UTF-8 character (continuation bytes are 10xxxxxx).
    while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString('utf8'));
    start = end;
    // The leading space counts in the next line's 75.
    limit = 74;
  }
  return parts.join('\r\n ');
}

const compactDay = (day: string) => day.replaceAll('-', '');
const nextDay = (day: string) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const stamp = (date: Date) => `${date.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`;

export function calendarFile(name: string, events: FeedEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyArcheryDiary//Journal//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    // Calendar apps read it again about every few hours.
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@myarcherydiary`,
      `DTSTAMP:${stamp(event.updatedAt)}`,
      `DTSTART;VALUE=DATE:${compactDay(event.day)}`,
      `DTEND;VALUE=DATE:${compactDay(nextDay(event.day))}`,
      `SUMMARY:${escapeText(event.summary)}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

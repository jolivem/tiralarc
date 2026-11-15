/**
 * Calligraphy fonts the archer picks for the calendars' weekdays and day numbers (Profile
 * page). The API stores the id (`calendarFont`); each font is loaded by the root layout
 * under its CSS variable, and `--font-calendar` (set on <html>) points to the chosen one.
 */
export const CALENDAR_FONTS = {
  'dancing-script': '--font-cal-dancing-script',
  // Simpler, easier to read: an upright handwriting (the notebook's own fallback, always
  // loaded), and a plain font drawn for legibility.
  'patrick-hand': '--font-hand-upright',
  atkinson: '--font-cal-atkinson',
  satisfy: '--font-cal-satisfy',
  courgette: '--font-cal-courgette',
  'kaushan-script': '--font-cal-kaushan-script',
  'great-vibes': '--font-cal-great-vibes',
  allura: '--font-cal-allura',
  'alex-brush': '--font-cal-alex-brush',
  sacramento: '--font-cal-sacramento',
  parisienne: '--font-cal-parisienne',
  yellowtail: '--font-cal-yellowtail',
} as const;

export type CalendarFontId = keyof typeof CALENDAR_FONTS;
export const CALENDAR_FONT_IDS = Object.keys(CALENDAR_FONTS) as CalendarFontId[];
export const DEFAULT_CALENDAR_FONT: CalendarFontId = 'dancing-script';

/** The archer's font, or the default for none / an id this client doesn't ship. */
export function calendarFont(id: string | null | undefined): CalendarFontId {
  return id && id in CALENDAR_FONTS ? (id as CalendarFontId) : DEFAULT_CALENDAR_FONT;
}

/** `font-family` value of a calendar font (the plain one falls back on a sans-serif). */
export const calendarFontFamily = (id: CalendarFontId) =>
  `var(${CALENDAR_FONTS[id]}), ${id === 'atkinson' ? 'sans-serif' : 'cursive'}`;

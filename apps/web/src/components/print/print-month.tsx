'use client';

import type { JournalSessionSummary, ThemeFill } from '@tiralarc/api-client';
import { useFormatter } from 'next-intl';
import { ColorableCanvas, useArtwork } from '@/components/journal/calendar-frame';
import { EventIcon } from '@/components/journal/event-display';
import { useLettering } from '@/components/journal/month-title';
import { findTheme, type ThemeBand, themeImage, THEMES } from '@/components/journal/themes';
import { PENDING_ATTRIBUTE } from './markers';
import classes from './print.module.css';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** A Monday, to name the weekdays from. */
const MONDAY = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;
const NO_FILLS = () => undefined;

/** One band of the decoration, coloured as the archer left it; marked pending until drawn. */
function PrintBand({
  theme,
  band,
  fills,
  className,
}: {
  theme: NonNullable<ReturnType<typeof findTheme>>;
  band: ThemeBand;
  fills: ThemeFill[];
  className?: string;
}) {
  const art = useArtwork(themeImage(theme, band));
  if (!art)
    return <div className={`${classes.band} ${className}`} {...{ [PENDING_ATTRIBUTE]: '' }} />;
  return (
    <ColorableCanvas
      art={art}
      band={band}
      fills={fills}
      tool={null}
      onFillsChange={NO_FILLS}
      className={`${classes.band} ${className}`}
    />
  );
}

/**
 * A month of the extract, on a page of its own: its decoration (bands around the calendar)
 * and its name in hollow letters, both coloured as on the Journal page, then the days with
 * the icons of their events. Days of the month outside the extract are faded.
 */
export function PrintMonth({
  month,
  theme: themeId,
  fills,
  sessions,
  from,
  to,
}: {
  /** "YYYY-MM". */
  month: string;
  theme: string | null;
  fills: ThemeFill[];
  /** The month's events. */
  sessions: JournalSessionSummary[];
  from: string;
  to: string;
}) {
  const format = useFormatter();
  const theme = findTheme(themeId);
  const bands: readonly ThemeBand[] = theme ? THEMES[theme].bands : [];
  const [year, index] = month.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(year, index - 1, 1));
  const name = capitalize(format.dateTime(first, { month: 'long', timeZone: 'UTC' }));
  const lettering = useLettering(name);

  const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
  // Weeks start on Monday: blank cells before the 1st.
  const lead = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((lead + length) / 7) * 7 }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= length ? day : null;
  });
  const band = (name: ThemeBand, className?: string) =>
    theme && bands.includes(name) ? (
      <PrintBand theme={theme} band={name} fills={fills} className={className} />
    ) : null;

  return (
    <section className={`${classes.page} ${classes.month}`}>
      {band('top', classes.bandTop)}
      <div className={classes.monthMiddle}>
        {band('left', classes.bandSide)}
        <div className={classes.monthBody}>
          {lettering ? (
            <ColorableCanvas
              art={lettering}
              band="title"
              fills={fills}
              tool={null}
              onFillsChange={NO_FILLS}
              className={classes.lettering}
              enclosedOnly
            />
          ) : (
            <div className={classes.lettering} {...{ [PENDING_ATTRIBUTE]: '' }} />
          )}
          <div className={classes.year}>{year}</div>
          <div className={classes.weekdays} aria-hidden>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i}>
                {format.dateTime(new Date(MONDAY + i * DAY_MS), {
                  weekday: 'short',
                  timeZone: 'UTC',
                })}
              </span>
            ))}
          </div>
          <div className={classes.days}>
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className={classes.day} />;
              const date = `${month}-${String(day).padStart(2, '0')}`;
              return (
                <div
                  key={i}
                  className={classes.day}
                  data-outside={date < from || date > to || undefined}
                >
                  <span className={classes.dayNumber}>{day}</span>
                  <span className={classes.dayIcons}>
                    {sessions
                      .filter((s) => s.date === date)
                      .map((s) => (
                        <EventIcon key={s.id} session={s} size={16} />
                      ))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {band('right', classes.bandSide)}
      </div>
      {band('bottom', classes.bandBottom)}
    </section>
  );
}

'use client';

import type { JournalSessionSummary, MonthStars, ThemeFill } from '@tiralarc/api-client';
import { useFormatter } from 'next-intl';
import { ColorableCanvas, useArtwork } from '@/components/journal/calendar-frame';
import { EventIcon } from '@/components/journal/event-display';
import { MonthSummaryCard } from '@/components/journal/month-summary';
import { useLettering } from '@/components/journal/month-title';
import { findTheme, type ThemeBand, themeImage, THEMES } from '@/components/journal/themes';
import { BLANK_ATTRIBUTE, PENDING_ATTRIBUTE, SPREAD_ATTRIBUTE } from './markers';
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
 * A month of the extract, on a double page (left page even, so the two face each other: a
 * blank page before it when needed, lib/pdf.ts): its
 * decoration (bands around the calendar) and its name in hollow letters, both coloured as on
 * the Journal page, then the days with the icons of their events: Monday to Thursday on the
 * left, Friday to Sunday on the right, same-sized boxes against the fold, the side bands in what
 * they leave, no year. Days of the month outside the
 * extract are faded. At the bottom right of the right page, the month's summary (its arrows
 * and the archer's satisfaction), as on the Journal page. Laid out once across both pages (the
 * bands run across the fold), then shown through each page's window.
 */
export function PrintMonth({
  month,
  theme: themeId,
  fills,
  sessions,
  stars,
  from,
  to,
}: {
  /** The month's satisfaction (the journal's), null when not given. */
  stars: MonthStars | null;
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
  const weeks = cells.length / 7;
  // The month's summary (arrows, satisfaction) goes where the right page has room: in its last
  // week when Friday to Sunday are blank there, else in a strip under the days (both pages,
  // so the weeks stay level), never over the calendar or the bottom band.
  const lastWeekFree = [4, 5, 6].every((d) => cells[(weeks - 1) * 7 + d] === null);
  const summary = (
    <MonthSummaryCard
      arrows={sessions.reduce((sum, s) => sum + (s.arrowCount ?? 0), 0)}
      stars={stars}
      print
    />
  );
  const band = (name: ThemeBand, className?: string) =>
    theme && bands.includes(name) ? (
      <PrintBand theme={theme} band={name} fills={fills} className={className} />
    ) : null;
  const weekday = (i: number) => (
    <span key={i}>
      {format.dateTime(new Date(MONDAY + i * DAY_MS), { weekday: 'short', timeZone: 'UTC' })}
    </span>
  );
  // Row after row, the cells of the given weekdays (0 = Monday); `summaryLast`: the last row's
  // blank cells give way to the month's summary.
  const days = (weekdays: number[], summaryLast = false) => [
    ...Array.from({ length: summaryLast ? weeks - 1 : weeks }, (_, week) =>
      weekdays.map((d) => week * 7 + d),
    )
      .flat()
      .map((i) => {
        const day = cells[i];
        if (day === null) return <div key={i} className={`${classes.day} ${classes.blank}`} />;
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const events = sessions.filter((s) => s.date === date);
        // As large as the day's box allows: one alone, two side by side, up to 4 in two rows.
        const size = events.length <= 1 ? 54 : events.length === 2 ? 40 : 34;
        return (
          <div key={i} className={classes.day} data-outside={date < from || date > to || undefined}>
            <span className={classes.dayNumber}>{day}</span>
            <span className={classes.dayIcons}>
              {events.map((s) => (
                <EventIcon key={s.id} session={s} size={size} />
              ))}
            </span>
          </div>
        );
      }),
    ...(summaryLast
      ? [
          <div key="summary" className={classes.summaryInWeek}>
            {summary}
          </div>,
        ]
      : []),
  ];

  // Both pages show the same spread, the right one shifted by a page's width.
  const spread = (
    <div className={classes.spread} data-summary={lastWeekFree ? 'week' : 'strip'}>
      {band('left', classes.bandLeft)}
      {band('right', classes.bandRight)}
      {band('top', classes.bandTop)}
      <div className={classes.monthMiddle}>
        <div className={classes.half}>
          <div className={classes.monthBody}>
            <div className={classes.monthHeader}>
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
            </div>
            <div className={classes.weekdays} aria-hidden>
              {Array.from({ length: 4 }, (_, i) => weekday(i))}
            </div>
            <div className={classes.days}>{days([0, 1, 2, 3])}</div>
            <div className={classes.monthSummaryRow} />
          </div>
        </div>
        <div className={classes.half}>
          <div className={`${classes.monthBody} ${classes.threeDays}`}>
            {/* Left blank (no year): as tall as the month's name, the weeks stay level. */}
            <div className={classes.monthHeader} />
            <div className={`${classes.weekdays} ${classes.threeDays}`} aria-hidden>
              {Array.from({ length: 3 }, (_, i) => weekday(4 + i))}
            </div>
            <div className={`${classes.days} ${classes.threeDays}`}>
              {days([4, 5, 6], lastWeekFree)}
            </div>
            <div className={classes.monthSummaryRow}>{!lastWeekFree && summary}</div>
          </div>
        </div>
      </div>
      {band('bottom', classes.bandBottom)}
    </div>
  );

  return (
    <>
      {/* Shown (lib/pdf.ts) when the left page would otherwise land on an odd page. */}
      <div className={classes.blankPage} {...{ [BLANK_ATTRIBUTE]: '' }} />
      <section
        id={`month-${month}`}
        className={`${classes.page} ${classes.month}`}
        {...{ [SPREAD_ATTRIBUTE]: '' }}
      >
        {spread}
      </section>
      <section className={`${classes.page} ${classes.month} ${classes.monthRight}`}>
        {spread}
      </section>
    </>
  );
}

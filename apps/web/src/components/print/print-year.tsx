'use client';

import type { CustomEventType, JournalSessionSummary } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { eventDisplay, pendingReason } from '@/components/journal/event-display';
import { useLegendRows } from '@/components/journal/event-legend';
import classes from './print.module.css';

/** A Monday, to name the weekdays from. */
const MONDAY = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

/**
 * Every month of the extract on one page, as the season calendar shows them: each day with
 * one coloured dot per event (lighter while its review is missing or its day is to come),
 * the legend of the colours at the bottom. Days of a month outside the extract are faded.
 * Titled with the journal's name; that and the months' names (no year) highlighted.
 */
export function PrintYear({
  title,
  months,
  sessions,
  customTypes,
  from,
  to,
  today,
}: {
  /** The journal's name ("Saison 2026-2027"); a generic title without one. */
  title: string | null;
  /** "YYYY-MM", in order: at most 13 (366 days). */
  months: string[];
  sessions: JournalSessionSummary[];
  customTypes: CustomEventType[];
  from: string;
  to: string;
  today: string;
}) {
  const t = useTranslations('export');
  const tJournal = useTranslations('journal');
  const format = useFormatter();
  const legend = useLegendRows(customTypes);

  const byDay = new Map<string, JournalSessionSummary[]>();
  for (const session of sessions) {
    byDay.set(session.date, [...(byDay.get(session.date) ?? []), session]);
  }
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    format.dateTime(new Date(MONDAY + i * DAY_MS), { weekday: 'narrow', timeZone: 'UTC' }),
  );

  return (
    <section className={`${classes.page} ${classes.year}`}>
      <h2 className={`${classes.heading} ${classes.yearTitle}`}>
        <span className={classes.highlight}>{title ?? t('yearTitle')}</span>
      </h2>
      <div className={classes.yearMonths}>
        {months.map((month) => {
          const [year, index] = month.split('-').map(Number) as [number, number];
          const first = new Date(Date.UTC(year, index - 1, 1));
          const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
          // Weeks start on Monday: blank cells before the 1st.
          const lead = (first.getUTCDay() + 6) % 7;
          const name = format.dateTime(first, { month: 'long', timeZone: 'UTC' });
          return (
            <div key={month}>
              <div className={classes.yearMonthName}>
                <span className={classes.highlight}>{name}</span>
              </div>
              <div className={classes.yearGrid}>
                {weekdays.map((day, i) => (
                  <span key={i} className={classes.muted}>
                    {day}
                  </span>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`blank-${i}`} />
                ))}
                {Array.from({ length }, (_, i) => {
                  const date = `${month}-${String(i + 1).padStart(2, '0')}`;
                  return (
                    <div
                      key={date}
                      className={classes.yearDay}
                      data-outside={date < from || date > to || undefined}
                    >
                      <span>{i + 1}</span>
                      <span className={classes.yearDots}>
                        {(byDay.get(date) ?? []).map((event) => (
                          <i
                            key={event.id}
                            data-pending={pendingReason(event, today) !== null || undefined}
                            style={{
                              background: `var(--mantine-color-${eventDisplay(event).color}-filled)`,
                            }}
                          />
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className={classes.legend} role="list" aria-label={tJournal('legend')}>
        {legend.map(({ key, color, label }) => (
          <span key={key} className={classes.legendItem} role="listitem">
            <i style={{ background: `var(--mantine-color-${color}-filled)` }} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

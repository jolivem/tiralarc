'use client';

import { SimpleGrid, type SimpleGridProps, Text } from '@mantine/core';
import type { Competition, JournalSessionSummary } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { RuledLine } from '@/components/notebook/on-ruling';
import { competitionDays } from './competition-list';
import { eventDisplay, pendingReason } from './event-display';
import classes from './journal.module.css';
import { SESSION_TYPES } from './session-types';

/** Dots shown under a day; further events only appear in its tooltip. */
const MAX_DOTS = 3;

/**
 * Read-only glance at a journal, drawn straight on the notebook page: a few months,
 * each day carrying one coloured dot per event. The Journal section edits: with
 * `linkToJournal`, each month leads there, opened on that month.
 */
export function MonthsOverview({
  months,
  today,
  sessions,
  competitions = [],
  cols = 1,
  linkToJournal = false,
  ruled = false,
}: {
  /** The months' names on the notebook page's lines (home page). */
  ruled?: boolean;
  /** Months to show, "YYYY-MM", in order. */
  months: string[];
  /** "YYYY-MM-DD", decided by the server so both renders agree. */
  today: string;
  sessions: JournalSessionSummary[];
  /** FFTA competitions: their days are outlined (postponed and cancelled ones left out). */
  competitions?: Competition[];
  /** Months per row. */
  cols?: SimpleGridProps['cols'];
  linkToJournal?: boolean;
}) {
  const t = useTranslations('journal');
  const tArcher = useTranslations('archer');
  const format = useFormatter();

  const byDay = new Map<string, JournalSessionSummary[]>();
  for (const session of sessions) {
    byDay.set(session.date, [...(byDay.get(session.date) ?? []), session]);
  }
  const competitionsByDay = new Map<string, string[]>();
  for (const competition of competitions) {
    // Postponed and cancelled ones are only listed below the months.
    if (competition.status !== 'SCHEDULED') continue;
    for (const day of competitionDays(competition)) {
      competitionsByDay.set(day, [...(competitionsByDay.get(day) ?? []), competition.title]);
    }
  }
  const label = (session: JournalSessionSummary) => {
    const name =
      (SESSION_TYPES[session.type].form === 'note' && session.title) ||
      session.customType?.title ||
      t(`typesShort.${session.type}`);
    // Only a past event still to complete says so: anything to come is obviously not done yet.
    const pending = session.date > today ? null : pendingReason(session, today);
    return pending ? `${name} (${t(pending)})` : name;
  };
  // Monday first; 2024-01-01 was a Monday.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    format.dateTime(new Date(2024, 0, 1 + i, 12), { weekday: 'narrow' }),
  );

  return (
    <SimpleGrid cols={cols} spacing="xl" className={classes.overview}>
      {months.map((month) => {
        const first = dayjs(`${month}-01`);
        // Empty cells before the 1st, so it falls under its weekday.
        const offset = (first.day() + 6) % 7;
        const name = format.dateTime(first.hour(12).toDate(), { month: 'long', year: 'numeric' });
        const content = (
          <>
            {ruled ? (
              // On the notebook page's lines, the line under the heading.
              <RuledLine className={`${classes.monthName} ${classes.ruledMonthName}`}>
                {name}
              </RuledLine>
            ) : (
              <Text ta="center" mb={6} tt="capitalize" className={classes.monthName}>
                {name}
              </Text>
            )}
            <div className={classes.miniMonth}>
              {weekdays.map((day, i) => (
                <Text key={i} size="xs" c="dimmed" ta="center" aria-hidden>
                  {day}
                </Text>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: first.daysInMonth() }, (_, i) => {
                const date = first.date(i + 1).format('YYYY-MM-DD');
                const events = byDay.get(date) ?? [];
                const held = competitionsByDay.get(date);
                const names = [
                  ...events.map(label),
                  ...(held ? [tArcher('competitions.dayMark', { names: held.join(', ') })] : []),
                ].join(', ');
                return (
                  <div
                    key={date}
                    className={classes.miniDay}
                    data-today={date === today || undefined}
                    data-competition={held ? true : undefined}
                    title={names || undefined}
                  >
                    <span>{i + 1}</span>
                    <span className={classes.miniDots}>
                      {events.slice(0, MAX_DOTS).map((event) => (
                        <i
                          key={event.id}
                          // Lighter until its review is written, or (no review) until its day.
                          data-pending={pendingReason(event, today) !== null || undefined}
                          style={{
                            background: `var(--mantine-color-${eventDisplay(event).color}-filled)`,
                          }}
                        />
                      ))}
                    </span>
                    {names && <span className={classes.srOnly}>{names}</span>}
                  </div>
                );
              })}
            </div>
          </>
        );
        return linkToJournal ? (
          <Link
            key={month}
            href={{ pathname: '/archer/journal', query: { month } }}
            className={classes.monthLink}
            aria-label={tArcher('openMonth', { month: name })}
            title={tArcher('openMonth', { month: name })}
          >
            {content}
          </Link>
        ) : (
          <div key={month}>{content}</div>
        );
      })}
    </SimpleGrid>
  );
}

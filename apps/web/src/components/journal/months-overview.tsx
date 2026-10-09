'use client';

import { Card, SimpleGrid, Text, Title } from '@mantine/core';
import type { JournalSessionSummary } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { eventDisplay } from './event-display';
import classes from './journal.module.css';
import { SESSION_TYPES } from './session-types';

/** Dots shown under a day; further events only appear in its tooltip. */
const MAX_DOTS = 3;

/**
 * Read-only glance at a journal: a few months side by side, each day carrying
 * one coloured dot per event. Nothing is clickable — the Journal section edits.
 */
export function MonthsOverview({
  title,
  months,
  today,
  sessions,
}: {
  title: string;
  /** Months to show, "YYYY-MM", in order. */
  months: string[];
  /** "YYYY-MM-DD", decided by the server so both renders agree. */
  today: string;
  sessions: JournalSessionSummary[];
}) {
  const t = useTranslations('journal');
  const format = useFormatter();

  const byDay = new Map<string, JournalSessionSummary[]>();
  for (const session of sessions) {
    byDay.set(session.date, [...(byDay.get(session.date) ?? []), session]);
  }
  const label = (session: JournalSessionSummary) =>
    (SESSION_TYPES[session.type].form === 'note' && session.title) ||
    t(`typesShort.${session.type}`);
  // Monday first; 2024-01-01 was a Monday.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    format.dateTime(new Date(2024, 0, 1 + i, 12), { weekday: 'narrow' }),
  );

  return (
    <Card withBorder radius="lg" padding="lg">
      <Title order={2} size="h5" tt="uppercase" c="dimmed" lts={0.5} mb="md">
        {title}
      </Title>
      {/* 1 column on phones, side by side from tablets. */}
      <SimpleGrid cols={{ base: 1, sm: months.length }} spacing="xl">
        {months.map((month) => {
          const first = dayjs(`${month}-01`);
          // Empty cells before the 1st, so it falls under its weekday.
          const offset = (first.day() + 6) % 7;
          return (
            <div key={month}>
              <Text fw={600} ta="center" mb={6} tt="capitalize">
                {format.dateTime(first.hour(12).toDate(), { month: 'long', year: 'numeric' })}
              </Text>
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
                  const names = events.map(label).join(', ');
                  return (
                    <div
                      key={date}
                      className={classes.miniDay}
                      data-today={date === today || undefined}
                      title={names || undefined}
                    >
                      <span>{i + 1}</span>
                      <span className={classes.miniDots}>
                        {events.slice(0, MAX_DOTS).map((event) => (
                          <i
                            key={event.id}
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
            </div>
          );
        })}
      </SimpleGrid>
    </Card>
  );
}

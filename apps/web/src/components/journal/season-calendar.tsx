'use client';

import { Center, Loader, Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { Journal, JournalSessionSummary } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState, useTransition } from 'react';
import { listSessions } from '@/app/actions/journal';
import { MonthsOverview } from './months-overview';
import classes from './season-calendar.module.css';

/** The API returns at most this span of events per request. */
const MAX_RANGE_DAYS = 366;

/** "YYYY-MM" of every month the period touches, in order. */
function monthsOf(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  const last = dayjs(endDate).startOf('month');
  for (
    let month = dayjs(startDate).startOf('month');
    !month.isAfter(last);
    month = month.add(1, 'month')
  ) {
    months.push(month.format('YYYY-MM'));
  }
  return months;
}

/** The period's events, fetched in spans the API accepts. */
async function eventsOf(startDate: string, endDate: string): Promise<JournalSessionSummary[]> {
  const end = dayjs(endDate);
  const spans: [string, string][] = [];
  for (let from = dayjs(startDate); !from.isAfter(end); from = from.add(MAX_RANGE_DAYS, 'day')) {
    const spanEnd = from.add(MAX_RANGE_DAYS - 1, 'day');
    const to = spanEnd.isAfter(end) ? end : spanEnd;
    spans.push([from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')]);
  }
  const results = await Promise.all(spans.map(([from, to]) => listSessions(from, to)));
  return results.flat();
}

/**
 * Wraps the home page's months: clicking them opens the whole season of the journal
 * (every month of its period) in a dialog titled with the journal's name.
 */
export function SeasonCalendar({
  journal,
  today,
  children,
}: {
  journal: Pick<Journal, 'title' | 'startDate' | 'endDate'>;
  /** "YYYY-MM-DD", decided by the server so both renders agree. */
  today: string;
  /** What opens it: the months shown on the page. */
  children: ReactNode;
}) {
  const t = useTranslations('archer');
  const isPhone = useMediaQuery('(max-width: 48em)');
  const [opened, setOpened] = useState(false);
  const [sessions, setSessions] = useState<JournalSessionSummary[] | null>(null);
  const [loading, startLoading] = useTransition();

  const open = () => {
    setOpened(true);
    // Reloaded on each opening, so events added meanwhile show.
    startLoading(async () => setSessions(await eventsOf(journal.startDate, journal.endDate)));
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={t('openSeason')}
        title={t('openSeason')}
        className={classes.trigger}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
      >
        {children}
      </div>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={journal.title}
        classNames={{ title: classes.title }}
        closeButtonProps={{ 'aria-label': t('close'), size: 'lg' }}
        fullScreen={isPhone}
        size="min(1200px, 95vw)"
        radius="lg"
        centered
      >
        {loading || sessions === null ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (
          <MonthsOverview
            months={monthsOf(journal.startDate, journal.endDate)}
            today={today}
            sessions={sessions}
            cols={{ base: 1, xs: 2, md: 3, lg: 4 }}
            linkToJournal
          />
        )}
      </Modal>
    </>
  );
}

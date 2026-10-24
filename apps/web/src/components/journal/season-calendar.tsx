'use client';

import { Center, Loader, LoadingOverlay, Modal, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type {
  CompetitionList,
  CustomEventType,
  Journal,
  JournalSessionSummary,
} from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState, useTransition } from 'react';
import { listCompetitions, listSessions } from '@/app/actions/journal';
import { CompetitionListPanel } from './competition-list';
import { EventLegendPanel } from './event-legend';
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
 * (every month of its period) in a dialog titled with the journal's name. Below the months, the
 * FFTA competitions still to come in the archer's department (profile), their days outlined.
 */
export function SeasonCalendar({
  journal,
  today,
  customTypes,
  children,
}: {
  journal: Pick<Journal, 'title' | 'startDate' | 'endDate'>;
  /** "YYYY-MM-DD", decided by the server so both renders agree. */
  today: string;
  /** The archer's own event types, for the legend above the months. */
  customTypes: CustomEventType[];
  /** What opens it: the months shown on the page. */
  children: ReactNode;
}) {
  const t = useTranslations('archer');
  const isPhone = useMediaQuery('(max-width: 48em)');
  const [opened, setOpened] = useState(false);
  const [sessions, setSessions] = useState<JournalSessionSummary[] | null>(null);
  /** Undefined for a season already over: no competitions to come. */
  const [competitions, setCompetitions] = useState<CompetitionList | null | undefined>();
  const [loading, startLoading] = useTransition();
  // The FFTA calendar from today to the end of the season.
  const competitionsFrom = today > journal.startDate ? today : journal.startDate;
  const withCompetitions = competitionsFrom <= journal.endDate;

  const open = () => {
    setOpened(true);
    // Reloaded on each opening, so events added meanwhile show.
    startLoading(async () => {
      const [events, list] = await Promise.all([
        eventsOf(journal.startDate, journal.endDate),
        withCompetitions ? listCompetitions(competitionsFrom, journal.endDate) : undefined,
      ]);
      setSessions(events);
      setCompetitions(list);
    });
  };
  /** A competition was added: its day now has an event. */
  const reloadEvents = () =>
    startLoading(async () => setSessions(await eventsOf(journal.startDate, journal.endDate)));

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
        {sessions === null ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (
          <Stack gap="xl" pos="relative">
            <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />
            <Stack gap="md">
              {/* What each event's icon and colour stand for. */}
              <EventLegendPanel customTypes={customTypes} />
              <MonthsOverview
                months={monthsOf(journal.startDate, journal.endDate)}
                today={today}
                sessions={sessions}
                competitions={competitions?.competitions}
                cols={{ base: 1, xs: 2, md: 3, lg: 4 }}
                linkToJournal
              />
            </Stack>
            {competitions !== undefined && (
              <CompetitionListPanel
                list={competitions}
                sessions={sessions}
                today={today}
                onAdded={reloadEvents}
              />
            )}
          </Stack>
        )}
      </Modal>
    </>
  );
}

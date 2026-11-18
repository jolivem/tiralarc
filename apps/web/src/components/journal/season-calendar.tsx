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
import { listAthleteCompetitions, listAthleteSessions } from '@/app/actions/coaching';
import { listCompetitions } from '@/app/actions/journal';
import { eventsOf } from '@/lib/journal-events';
import { EventLegendPanel } from './event-legend';
import { MonthsOverview } from './months-overview';
import classes from './season-calendar.module.css';

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

type SeasonJournal = Pick<Journal, 'title' | 'startDate' | 'endDate'>;

/**
 * Opens the whole season of a journal (every month of its period) in a dialog titled with the
 * journal's name: the legend, then the months, each on its pastel, with the days of the FFTA
 * competitions still to come in the archer's departments (profile) outlined (none for an archer
 * who doesn't practise in France: `ffta` false, or the API answers none). Events and
 * competitions are reloaded on each opening, so what was added meanwhile shows.
 * Returns `open` and the dialog to render.
 */
export function useSeasonDialog({
  journal,
  today,
  customTypes,
  ffta = true,
  coachOf,
  onPick,
}: {
  journal: SeasonJournal;
  /** "YYYY-MM-DD", decided by the server (home page) or the browser (Journal page). */
  today: string;
  /** The archer's own event types, for the legend above the months. */
  customTypes: CustomEventType[];
  /** Whether the archer practises in France: the FFTA competitions show. */
  ffta?: boolean;
  /** The coach's view of this archer's journal. */
  coachOf?: string;
  /** A click on a month hands it over (the Journal page); otherwise it opens the Journal page. */
  onPick?: (month: string) => void;
}): { open: () => void; dialog: ReactNode } {
  const t = useTranslations('archer');
  const isPhone = useMediaQuery('(max-width: 48em)');
  const [opened, setOpened] = useState(false);
  const [sessions, setSessions] = useState<JournalSessionSummary[] | null>(null);
  /** Undefined for a season already over: no competitions to come. */
  const [competitions, setCompetitions] = useState<CompetitionList | null | undefined>();
  const [loading, startLoading] = useTransition();
  // The FFTA calendar from today to the end of the season.
  const competitionsFrom = today > journal.startDate ? today : journal.startDate;
  const withCompetitions = ffta && competitionsFrom <= journal.endDate;

  const open = () => {
    setOpened(true);
    startLoading(async () => {
      const [events, list] = await Promise.all([
        coachOf
          ? listAthleteSessions(coachOf, journal.startDate, journal.endDate)
          : eventsOf(journal.startDate, journal.endDate),
        withCompetitions
          ? coachOf
            ? listAthleteCompetitions(coachOf, competitionsFrom, journal.endDate)
            : listCompetitions(competitionsFrom, journal.endDate)
          : undefined,
      ]);
      setSessions(events);
      setCompetitions(list);
    });
  };

  const dialog = (
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
              linkToJournal={!onPick}
              onPick={
                onPick &&
                ((month) => {
                  onPick(month);
                  setOpened(false);
                })
              }
              pastel
            />
          </Stack>
        </Stack>
      )}
    </Modal>
  );
  return { open, dialog };
}

/**
 * Wraps the home page's months: clicking them opens the whole season (`useSeasonDialog`).
 * The competitions' list is the "Planification Concours" card's (`competition-planning.tsx`).
 */
export function SeasonCalendar({
  journal,
  today,
  customTypes,
  ffta = true,
  children,
}: {
  journal: SeasonJournal;
  /** Whether the archer practises in France: the FFTA competitions show. */
  ffta?: boolean;
  /** "YYYY-MM-DD", decided by the server so both renders agree. */
  today: string;
  /** The archer's own event types, for the legend above the months. */
  customTypes: CustomEventType[];
  /** What opens it: the months shown on the page. */
  children: ReactNode;
}) {
  const t = useTranslations('archer');
  const { open, dialog } = useSeasonDialog({ journal, today, customTypes, ffta });
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
      {dialog}
    </>
  );
}

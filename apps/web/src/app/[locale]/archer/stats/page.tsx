import { SimpleGrid, Stack } from '@mantine/core';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { SectionPage } from '@/components/section-page';
import { ALL_TIME } from '@/components/stats/chart-utils';
import { GoalsCard } from '@/components/stats/goals-card';
import { PeriodSelect } from '@/components/stats/period-select';
import {
  ArrowsCard,
  CompetitionsCard,
  EventsCard,
  FeelingsCard,
  ScoresCard,
} from '@/components/stats/stats-cards';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getJournals, getSelectedJournal } from '@/lib/journals';

/**
 * Indicators over a period chosen on the page (`?period=`): the period of one
 * journal — by default the selected one — or all time.
 */
export default async function ArcherStatsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/archer/stats'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { period } = await searchParams;
  const t = await getTranslations();
  const format = await getFormatter();

  const [journals, selected] = await Promise.all([getJournals(), getSelectedJournal()]);
  // An unknown id (a deleted journal, a mistyped link) falls back to the default.
  const journal =
    period === ALL_TIME ? null : (journals.find((j) => j.id === period) ?? selected ?? null);

  const api = await getAuthedApi();
  const [{ data: stats }, { data: goals }] = await Promise.all([
    api.GET('/api/v1/journal/sessions/stats', {
      params: { query: journal ? { from: journal.startDate, to: journal.endDate } : {} },
    }),
    // Goals are the archer's, whatever the period shown.
    api.GET('/api/v1/goals'),
  ]);
  const {
    competitions,
    scores,
    arrowsByDay,
    eventsByDay,
    physicalFeelingsByDay,
    mentalFeelingsByDay,
  } = stats ?? {
    competitions: [],
    scores: [],
    arrowsByDay: [],
    eventsByDay: [],
    physicalFeelingsByDay: [],
    mentalFeelingsByDay: [],
  };

  // Decided here so the server and the browser draw the same "today" marker.
  const today = new Date().toISOString().slice(0, 10);
  // All time: the charts span from the first recorded event to the last one, or to today if
  // later (so the arrows card's "last n days" end today).
  const days = [...competitions.map((c) => c.date), ...arrowsByDay.map((d) => d.date)].sort();
  const last = days.at(-1) ?? today;
  const span = journal ?? {
    startDate: days[0] ?? today,
    endDate: last > today ? last : today,
  };
  // Noon, so the calendar day is the same in every time zone.
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00`), { dateStyle: 'medium' });

  return (
    <SectionPage
      title={t('archer.stats')}
      intro={
        journal
          ? t('journals.period', { start: day(journal.startDate), end: day(journal.endDate) })
          : t('stats.allTimeIntro')
      }
      actions={<PeriodSelect journals={journals} value={journal?.id ?? ALL_TIME} />}
    >
      {/* One wide page, so the charts keep their width. */}
      <Stack gap="lg">
        <GoalsCard goals={goals ?? []} today={today} />
        {/* Side by side on large screens, one above the other below. */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <ArrowsCard period={span} arrowsByDay={arrowsByDay} today={today} />
          <ScoresCard period={span} scores={scores} today={today} />
          <EventsCard period={span} eventsByDay={eventsByDay} today={today} />
          <FeelingsCard
            kind="physical"
            period={span}
            feelingsByDay={physicalFeelingsByDay}
            today={today}
          />
          <FeelingsCard
            kind="mental"
            period={span}
            feelingsByDay={mentalFeelingsByDay}
            today={today}
          />
        </SimpleGrid>
        <CompetitionsCard competitions={competitions} />
      </Stack>
    </SectionPage>
  );
}

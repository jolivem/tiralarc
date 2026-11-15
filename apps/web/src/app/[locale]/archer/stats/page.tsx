import { Group, SimpleGrid, Stack } from '@mantine/core';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { SeasonBoardButton } from '@/components/stats/season-board';
import { seasonSummary } from '@/lib/season-summary';
import { SectionPage } from '@/components/section-page';
import { ALL_TIME } from '@/components/stats/chart-utils';
import { FavoriteIndicatorProvider } from '@/components/stats/favorite';
import { GoalsCard } from '@/components/stats/goals-card';
import { PeriodSelect } from '@/components/stats/period-select';
import { RankingsCard } from '@/components/stats/rankings-card';
import {
  ArrowAveragesCard,
  ArrowsCard,
  CompetitionsCard,
  DurationsCard,
  EventsCard,
  FeelingsCard,
  ScoresCard,
} from '@/components/stats/stats-cards';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getArcherProfile } from '@/lib/archer-profile';
import { getCurrentUser } from '@/lib/current-user';
import { getJournals, getSelectedJournal } from '@/lib/journals';
import { getStats } from '@/lib/stats';

/**
 * Indicators over a period chosen on the page (`?period=`): the period of one
 * journal — by default the selected one — or all time. A star on each card (the goals
 * aside) picks the one shown on the home page.
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

  const [{ stats, span, today }, { data: goals }, profile, user] = await Promise.all([
    getStats(journal),
    // Goals are the archer's, whatever the period shown.
    (await getAuthedApi()).GET('/api/v1/goals'),
    getArcherProfile(),
    getCurrentUser(),
  ]);
  // The national rankings, only when practising in France (or not said yet); kept an hour in the
  // browser, read again once anything they depend on changes.
  const ffta = profile?.practisesInFrance !== false;
  const rankingsScope = JSON.stringify([
    user?.id,
    profile?.licenceNumber,
    profile?.category,
    profile?.bowType,
    profile?.disciplines,
  ]);
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
      actions={
        <Group gap="sm">
          {/* A journal's period: its season summary, on a whiteboard in a window. */}
          {journal && (
            <SeasonBoardButton
              journal={journal}
              summary={seasonSummary(stats, goals ?? [], journal.startDate, journal.endDate)}
            />
          )}
          <PeriodSelect journals={journals} value={journal?.id ?? ALL_TIME} />
        </Group>
      }
      squared
    >
      {/* One wide page, so the charts keep their width. */}
      <FavoriteIndicatorProvider initial={profile?.favoriteIndicator ?? null}>
        <Stack gap="lg">
          <GoalsCard goals={goals ?? []} today={today} />
          {ffta && <RankingsCard cacheScope={rankingsScope} />}
          {/*
            Side by side on large screens, one above the other below; the two cards of a row
            as high as each other (the taller one, in whole squares).
          */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <ArrowsCard period={span} arrowsByDay={stats.arrowsByDay} today={today} />
            <DurationsCard period={span} durationsByDay={stats.durationsByDay} today={today} />
            <ScoresCard period={span} scores={stats.scores} today={today} />
            <ArrowAveragesCard period={span} scores={stats.scores} today={today} />
            <EventsCard period={span} eventsByDay={stats.eventsByDay} today={today} />
            <CompetitionsCard competitions={stats.competitions} />
            <FeelingsCard
              kind="physical"
              period={span}
              feelingsByDay={stats.physicalFeelingsByDay}
              today={today}
            />
            <FeelingsCard
              kind="mental"
              period={span}
              feelingsByDay={stats.mentalFeelingsByDay}
              today={today}
            />
          </SimpleGrid>
        </Stack>
      </FavoriteIndicatorProvider>
    </SectionPage>
  );
}

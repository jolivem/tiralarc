import { SimpleGrid, Stack } from '@mantine/core';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { SectionPage } from '@/components/section-page';
import { GoalsCard } from '@/components/stats/goals-card';
import {
  ArrowsCard,
  CompetitionsCard,
  DurationsCard,
  EventsCard,
  FeelingsCard,
  ScoresCard,
} from '@/components/stats/stats-cards';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getAthlete } from '@/lib/coaching';
import { getStats } from '@/lib/stats';

/**
 * An archer's indicators over their journal of the season in progress, and their goals, as
 * their coach sees them (read-only: no favourite star, no goal editing).
 */
export default async function CoachStatsPage({
  params,
}: PageProps<'/[locale]/coach/[archerId]/stats'>) {
  const { locale, archerId } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const format = await getFormatter();

  const athlete = await getAthlete(archerId);
  if (!athlete) notFound();
  const { journal } = athlete;
  const [{ stats, span, today }, { data: goals }] = await Promise.all([
    getStats(journal, archerId),
    (await getAuthedApi()).GET('/api/v1/coach/athletes/{archerId}/goals', {
      params: { path: { archerId } },
    }),
  ]);
  // Noon, so the calendar day is the same in every time zone.
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00`), { dateStyle: 'medium' });

  return (
    <SectionPage
      title={t('archer.stats')}
      badge={athlete.name}
      intro={
        journal
          ? t('journals.period', { start: day(journal.startDate), end: day(journal.endDate) })
          : t('coach.noJournal')
      }
      squared
    >
      <Stack gap="lg">
        <GoalsCard goals={goals ?? []} today={today} readOnly />
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <ArrowsCard period={span} arrowsByDay={stats.arrowsByDay} today={today} />
          <DurationsCard period={span} durationsByDay={stats.durationsByDay} today={today} />
          <ScoresCard period={span} scores={stats.scores} today={today} />
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
    </SectionPage>
  );
}

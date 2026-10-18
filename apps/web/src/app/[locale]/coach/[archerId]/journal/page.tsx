import { Paper, Text } from '@mantine/core';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { JournalView } from '@/components/journal/journal-view';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getAthlete } from '@/lib/coaching';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * An archer's journal of the season in progress, as their coach sees it: read-only, or with
 * planning (WRITE access). `?month=YYYY-MM` opens it on that month.
 */
export default async function CoachJournalPage({
  params,
  searchParams,
}: PageProps<'/[locale]/coach/[archerId]/journal'>) {
  const { locale, archerId } = await params;
  setRequestLocale(locale as Locale);
  const { month: requested } = await searchParams;
  const month = typeof requested === 'string' && MONTH.test(requested) ? requested : undefined;
  const t = await getTranslations();
  const format = await getFormatter();
  const [athlete, { data: customTypes }] = await Promise.all([
    getAthlete(archerId),
    (await getAuthedApi()).GET('/api/v1/coach/athletes/{archerId}/event-types', {
      params: { path: { archerId } },
    }),
  ]);
  if (!athlete) notFound();
  const { journal } = athlete;

  if (!journal) {
    return (
      <SectionPage title={athlete.name} intro={t('coach.noJournal')} plain>
        <Paper withBorder radius="lg" p="xl">
          <Text size="sm" c="dimmed">
            {t('coach.noJournalBody', { name: athlete.name })}
          </Text>
        </Paper>
      </SectionPage>
    );
  }

  // Noon, so the calendar day is the same in every time zone.
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00`), { dateStyle: 'medium' });

  return (
    <SectionPage
      title={journal.title}
      badge={athlete.name}
      intro={`${t('journals.period', { start: day(journal.startDate), end: day(journal.endDate) })} · ${t(`coach.accessHint.${athlete.access}`)}`}
      plain
    >
      <JournalView
        key={`${journal.id}:${month ?? ''}`}
        journal={journal}
        customTypes={customTypes ?? []}
        month={month}
        coach={{ archerId, access: athlete.access }}
      />
    </SectionPage>
  );
}

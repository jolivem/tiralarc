import { Paper, Stack, Text } from '@mantine/core';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { JournalView } from '@/components/journal/journal-view';
import { NewJournalButton } from '@/components/journal/journal-modal';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getSelectedJournal } from '@/lib/journals';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Calendar of the selected journal (chosen on the account page). `?month=YYYY-MM`
 * opens it on that month (e.g. from the season calendar on the home page); `?day=YYYY-MM-DD`
 * on that day's month, with its FFTA competitions' dialog open (to add one to the journal).
 */
export default async function ArcherJournalPage({
  params,
  searchParams,
}: PageProps<'/[locale]/archer/journal'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { month: requested, day: requestedDay } = await searchParams;
  // A day's FFTA competitions to open (the home page's competitions to plan); on its month.
  const competitionDay =
    typeof requestedDay === 'string' && DAY.test(requestedDay) ? requestedDay : undefined;
  const month =
    competitionDay?.slice(0, 7) ??
    (typeof requested === 'string' && MONTH.test(requested) ? requested : undefined);
  const t = await getTranslations();
  const format = await getFormatter();
  const [journal, { data: customTypes }] = await Promise.all([
    getSelectedJournal(),
    (await getAuthedApi()).GET('/api/v1/journal/event-types'),
  ]);

  if (!journal) {
    return (
      <SectionPage title={t('archer.journal')} intro={t('archer.journalIntro')} plain>
        <Paper withBorder radius="lg" p="xl">
          <Stack align="flex-start" gap="sm">
            <Text fw={600}>{t('journals.noneTitle')}</Text>
            <Text size="sm" c="dimmed">
              {t('journals.noneBody')}
            </Text>
            <NewJournalButton variant="filled" />
          </Stack>
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
      intro={t('journals.period', { start: day(journal.startDate), end: day(journal.endDate) })}
      // Unruled paper: the calendar draws its own grid.
      plain
    >
      {/* Remounted when another journal or month is asked for, so the calendar opens on it. */}
      <JournalView
        key={`${journal.id}:${month ?? ''}:${competitionDay ?? ''}`}
        journal={journal}
        customTypes={customTypes ?? []}
        month={month}
        competitionDay={competitionDay}
      />
    </SectionPage>
  );
}

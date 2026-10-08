import { Paper, Stack, Text } from '@mantine/core';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { JournalView } from '@/components/journal/journal-view';
import { NewJournalButton } from '@/components/journal/journal-modal';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';
import { getSelectedJournal } from '@/lib/journals';

/** Calendar of the selected journal (chosen on the home dashboard). */
export default async function ArcherJournalPage({ params }: PageProps<'/[locale]/archer/journal'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const format = await getFormatter();
  const journal = await getSelectedJournal();

  if (!journal) {
    return (
      <SectionPage title={t('archer.journal')} intro={t('archer.journalIntro')}>
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
    >
      {/* Remounted when another journal is selected, so the calendar opens within its period. */}
      <JournalView key={journal.id} journal={journal} />
    </SectionPage>
  );
}

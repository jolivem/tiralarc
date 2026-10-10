import { SimpleGrid } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JournalsCard } from '@/components/journal/journals-card';
import { MonthsOverview } from '@/components/journal/months-overview';
import { SectionCard } from '@/components/section-card';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import { getJournals, getSelectedJournal } from '@/lib/journals';

const SECTIONS = ['sheets', 'stats', 'profile'] as const;
/** Months shown at the top of the page, starting with the current one. */
const OVERVIEW_MONTHS = 3;

/** "YYYY-MM" of the month `offset` months after `month`. */
function addMonths(month: string, offset: number): string {
  const [year, index] = month.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(year, index - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

export default async function ArcherHomePage({ params }: PageProps<'/[locale]/archer'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');
  const [user, journals, selected] = await Promise.all([
    getCurrentUser(),
    getJournals(),
    getSelectedJournal(),
  ]);

  // The selected journal's events over the months shown: those dated within its period.
  const today = new Date().toISOString().slice(0, 10);
  const months = Array.from({ length: OVERVIEW_MONTHS }, (_, i) => addMonths(today.slice(0, 7), i));
  const firstDay = `${months[0]}-01`;
  // The day before the first month not shown.
  const lastDay = new Date(
    Date.parse(`${addMonths(today.slice(0, 7), OVERVIEW_MONTHS)}-01`) - 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const from = selected && selected.startDate > firstDay ? selected.startDate : firstDay;
  const to = selected && selected.endDate < lastDay ? selected.endDate : lastDay;
  const { data: sessions } =
    selected && from <= to
      ? await (
          await getAuthedApi()
        ).GET('/api/v1/journal/sessions', { params: { query: { from, to } } })
      : { data: undefined };

  return (
    <SectionPage
      title={t('homeTitle', { name: user?.displayName ?? user?.email ?? '' })}
      intro={t('homeIntro')}
    >
      {selected && (
        <MonthsOverview
          title={selected.title}
          months={months}
          today={today}
          sessions={sessions ?? []}
        />
      )}
      {/* 1 column on phones, 3 from tablets. */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {SECTIONS.map((section) => (
          <SectionCard
            key={section}
            section={section}
            title={t(section)}
            description={t(`${section}Intro`)}
          />
        ))}
      </SimpleGrid>
      <JournalsCard journals={journals} selectedId={selected?.id ?? null} />
    </SectionPage>
  );
}

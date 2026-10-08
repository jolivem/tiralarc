import { SimpleGrid } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JournalsCard } from '@/components/journal/journals-card';
import { SectionCard } from '@/components/section-card';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/current-user';
import { getJournals, getSelectedJournal } from '@/lib/journals';

const SECTIONS = ['sheets', 'stats', 'profile'] as const;

export default async function ArcherHomePage({ params }: PageProps<'/[locale]/archer'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');
  const [user, journals, selected] = await Promise.all([
    getCurrentUser(),
    getJournals(),
    getSelectedJournal(),
  ]);

  return (
    <SectionPage
      title={t('homeTitle', { name: user?.displayName ?? user?.email ?? '' })}
      intro={t('homeIntro')}
    >
      <JournalsCard journals={journals} selectedId={selected?.id ?? null} />
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
    </SectionPage>
  );
}

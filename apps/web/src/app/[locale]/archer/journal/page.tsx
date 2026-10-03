import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JournalCalendar } from '@/components/journal-calendar';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';

export default async function ArcherJournalPage({ params }: PageProps<'/[locale]/archer/journal'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');

  return (
    <SectionPage
      title={t('journal')}
      intro={t('journalIntro')}
      actions={
        <Button leftSection={<IconPlus size={18} />} disabled title={t('comingSoon')}>
          {t('newSession')}
        </Button>
      }
    >
      <JournalCalendar />
    </SectionPage>
  );
}

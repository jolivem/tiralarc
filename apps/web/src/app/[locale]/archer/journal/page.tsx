import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JournalView } from '@/components/journal/journal-view';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';

export default async function ArcherJournalPage({ params }: PageProps<'/[locale]/archer/journal'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');

  return (
    <SectionPage title={t('journal')} intro={t('journalIntro')}>
      <JournalView />
    </SectionPage>
  );
}

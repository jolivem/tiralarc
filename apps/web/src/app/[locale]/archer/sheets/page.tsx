import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';

export default async function ArcherSheetsPage({ params }: PageProps<'/[locale]/archer/sheets'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');

  return <SectionPage title={t('sheets')} intro={t('sheetsIntro')} badge={t('comingSoon')} />;
}

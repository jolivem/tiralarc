import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';

export default async function ArcherStatsPage({ params }: PageProps<'/[locale]/archer/stats'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');

  return <SectionPage title={t('stats')} intro={t('statsIntro')} badge={t('comingSoon')} />;
}

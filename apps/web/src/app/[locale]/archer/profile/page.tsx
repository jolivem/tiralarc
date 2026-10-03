import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';

export default async function ArcherProfilePage({ params }: PageProps<'/[locale]/archer/profile'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');

  return <SectionPage title={t('profile')} intro={t('profileIntro')} badge={t('comingSoon')} />;
}

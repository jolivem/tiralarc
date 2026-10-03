import { SimpleGrid } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SectionCard } from '@/components/section-card';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/current-user';

const SECTIONS = ['journal', 'sheets', 'stats', 'profile'] as const;

export default async function ArcherHomePage({ params }: PageProps<'/[locale]/archer'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');
  const user = await getCurrentUser();

  return (
    <SectionPage
      title={t('homeTitle', { name: user?.displayName ?? user?.email ?? '' })}
      intro={t('homeIntro')}
    >
      {/* 1 column on phones, 2 on tablets, 4 on large screens. */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
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

import { Stack } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConfigurationCard, OptionsCard } from '@/components/profile/configuration-card';
import { InvitationsCard } from '@/components/profile/invitations-card';
import { PersonalizationCard } from '@/components/profile/personalization-card';
import { SitesCard } from '@/components/profile/sites-card';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getArcherProfile } from '@/lib/archer-profile';

const EMPTY_PROFILE = {
  licenceNumber: null,
  category: null,
  bowType: null,
  disciplines: [],
  calendarFont: null,
  favoriteIndicator: null,
};

export default async function ArcherProfilePage({ params }: PageProps<'/[locale]/archer/profile'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');

  const api = await getAuthedApi();
  const [profile, { data: invitations }, { data: sites }] = await Promise.all([
    // Already read by the root layout (calendar font).
    getArcherProfile(),
    api.GET('/api/v1/profile/invitations'),
    api.GET('/api/v1/profile/sites'),
  ]);

  return (
    // Lists on the left page, settings on the right (stacked on phones and tablets).
    <SectionPage
      title={t('profile')}
      intro={t('profileIntro')}
      // Dotted paper, like a bullet journal.
      dotted
      left={
        <Stack gap="md">
          <InvitationsCard invitations={invitations ?? []} />
          <SitesCard sites={sites ?? []} />
        </Stack>
      }
      right={
        <Stack gap="md">
          <ConfigurationCard profile={profile ?? EMPTY_PROFILE} />
          <PersonalizationCard font={profile?.calendarFont ?? null} />
          <OptionsCard />
        </Stack>
      }
    />
  );
}

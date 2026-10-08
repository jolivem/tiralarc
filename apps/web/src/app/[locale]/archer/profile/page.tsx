import { Grid, GridCol, Stack } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConfigurationCard, OptionsCard } from '@/components/profile/configuration-card';
import { InvitationsCard } from '@/components/profile/invitations-card';
import { SitesCard } from '@/components/profile/sites-card';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';

const EMPTY_PROFILE = { licenceNumber: null, category: null, bowType: null, disciplines: [] };

export default async function ArcherProfilePage({ params }: PageProps<'/[locale]/archer/profile'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');

  const api = await getAuthedApi();
  const [{ data: profile }, { data: invitations }, { data: sites }] = await Promise.all([
    api.GET('/api/v1/profile'),
    api.GET('/api/v1/profile/invitations'),
    api.GET('/api/v1/profile/sites'),
  ]);

  return (
    <SectionPage title={t('profile')} intro={t('profileIntro')}>
      {/* Lists on the left, settings on the right; one column on phones and tablets. */}
      <Grid gap="md">
        <GridCol span={{ base: 12, md: 5 }}>
          <Stack gap="md">
            <InvitationsCard invitations={invitations ?? []} />
            <SitesCard sites={sites ?? []} />
          </Stack>
        </GridCol>
        <GridCol span={{ base: 12, md: 7 }}>
          <Stack gap="md">
            <ConfigurationCard profile={profile ?? EMPTY_PROFILE} />
            <OptionsCard />
          </Stack>
        </GridCol>
      </Grid>
    </SectionPage>
  );
}

import { Stack } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CompetitionsCard, ConfigurationCard } from '@/components/profile/configuration-card';
import { InvitationsCard } from '@/components/profile/invitations-card';
import { CalendarFeedCard } from '@/components/profile/calendar-feed-card';
import { EmailsCard } from '@/components/profile/emails-card';
import { PersonalizationCard } from '@/components/profile/personalization-card';
import { SectionPage } from '@/components/section-page';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getArcherProfile } from '@/lib/archer-profile';
import { getJournals } from '@/lib/journals';
import { Tour } from '@/components/tour/tour';

/**
 * The Profile page's guided tour: a welcome, then each card (the competitions' one left out
 * when not practising in France).
 */
const PROFILE_TOUR = [
  'welcome',
  'guests',
  'competitions',
  'configuration',
  'personalization',
  'emails',
  'calendar-feed',
] as const;

const EMPTY_PROFILE = {
  licenceNumber: null,
  lastName: null,
  firstName: null,
  category: null,
  bowType: null,
  disciplines: [],
  calendarFont: null,
  favoriteIndicator: null,
  practisesInFrance: null,
  licenceDepartment: null,
  departments: [],
  paraCompetitions: false,
  homeTown: null,
  homeLatitude: null,
  homeLongitude: null,
  toursSeen: [] as string[],
  coachEmails: true,
  competitionReminders: true,
  hasCalendarFeed: false,
};

export default async function ArcherProfilePage({ params }: PageProps<'/[locale]/archer/profile'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');
  const tTour = await getTranslations('tours.profile');

  const api = await getAuthedApi();
  const [profile, { data: invitations }, { data: departments }, journals] = await Promise.all([
    // Already read by the root layout (calendar font).
    getArcherProfile(),
    api.GET('/api/v1/profile/invitations'),
    api.GET('/api/v1/competitions/departments'),
    getJournals(),
  ]);

  return (
    <>
      {/* Stacked on phones and tablets. */}
      <SectionPage
        title={t('profile')}
        // Dotted paper, like a bullet journal.
        dotted
        left={
          <Stack gap="md">
            <div data-tour="guests">
              <InvitationsCard invitations={invitations ?? []} />
            </div>
            {/* The FFTA's competitions: only when practising in France (or not said yet). */}
            {profile?.practisesInFrance !== false && (
              <div data-tour="competitions">
                <CompetitionsCard
                  profile={profile ?? EMPTY_PROFILE}
                  departments={departments ?? []}
                />
              </div>
            )}
          </Stack>
        }
        right={
          <Stack gap="md">
            <div data-tour="configuration">
              <ConfigurationCard
                profile={profile ?? EMPTY_PROFILE}
                departments={departments ?? []}
              />
            </div>
            <div data-tour="personalization">
              <PersonalizationCard font={profile?.calendarFont ?? null} />
            </div>
            <div data-tour="emails">
              <EmailsCard
                coachEmails={profile?.coachEmails ?? true}
                competitionReminders={profile?.competitionReminders ?? true}
              />
            </div>
            <div data-tour="calendar-feed">
              <CalendarFeedCard active={profile?.hasCalendarFeed ?? false} />
            </div>
          </Stack>
        }
      />
      {/* The first time only (then from the header's "?"). */}
      <Tour
        id="profile"
        autoStart={journals.length > 0 && !(profile?.toursSeen ?? []).includes('profile')}
        steps={PROFILE_TOUR.map((key) => ({
          target: key === 'welcome' ? undefined : key,
          title: tTour(`${key}.title`),
          body: tTour(`${key}.body`),
        }))}
      />
    </>
  );
}

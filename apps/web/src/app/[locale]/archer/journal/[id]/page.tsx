import { Group, Stack, Title } from '@mantine/core';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EventIcon } from '@/components/journal/event-display';
import classes from '@/components/journal/journal.module.css';
import { SessionForm } from '@/components/journal/session-form';
import { SessionPhotos } from '@/components/journal/session-photos';
import { SESSION_TYPES } from '@/components/journal/session-types';
import { Tour } from '@/components/tour/tour';
import type { SessionType } from '@tiralarc/api-client';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getArcherProfile } from '@/lib/archer-profile';

const EMPTY_SUGGESTIONS = { locations: [], distances: [], wentWell: [], toImprove: [] };
/** The types with a full sheet (informations, review, feelings…): those the tour shows. */
const SHEET_TYPES = new Set<SessionType>(['TRAINING', 'COACHING', 'COMPETITION']);
/**
 * The sheet's guided tour: a welcome, then each `data-tour` element of `SessionForm` (left out
 * when not shown: no steps for a competition, no "Refaire" or "Partager" before the day).
 */
const SHEET_TOUR = [
  'welcome',
  'info',
  'photos',
  'objective',
  'steps',
  'review',
  'feelings',
  'save',
  'again',
  'share',
] as const;

/** Session sheet (step 2 of the two-step entry). */
export default async function SessionPage({ params }: PageProps<'/[locale]/archer/journal/[id]'>) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('journal');
  const tTour = await getTranslations('tours.sheet');

  const api = await getAuthedApi();
  const [{ data: session }, { data: suggestions }, { data: photos }, { data: comments }, profile] =
    await Promise.all([
      api.GET('/api/v1/journal/sessions/{id}', { params: { path: { id } } }),
      api.GET('/api/v1/journal/sessions/suggestions'),
      api.GET('/api/v1/journal/sessions/{sessionId}/photos', {
        params: { path: { sessionId: id } },
      }),
      // The coach's, at the bottom of the sheet.
      api.GET('/api/v1/journal/sessions/{id}/comments', { params: { path: { id } } }),
      // Its disciplines are the ones offered (already read by the root layout: cached).
      getArcherProfile(),
    ]);
  // Unknown id, or someone else's session (the API answers 404 for both).
  if (!session) notFound();
  // Strength sessions and the archer's own types take no photos.
  const { photos: withPhotos } = SESSION_TYPES[session.type];

  // The type and its icon, top left of the sheet (SessionForm adds the day, which can change).
  const title = (
    <Group gap="sm" wrap="nowrap" align="center" h="calc(var(--step) * 2)">
      <Title order={1} className={classes.sheetTitle}>
        {session.customType?.title ?? t(`types.${session.type}`)}
      </Title>
      <EventIcon session={session} size={60} />
    </Group>
  );

  // The action bar (its cross leads back) and the loose-leaf sheet, drawn by SessionForm.
  return (
    <Stack gap="sm" maw={960} mx="auto" w="100%">
      <SessionForm
        session={session}
        suggestions={suggestions ?? EMPTY_SUGGESTIONS}
        disciplines={profile?.disciplines ?? []}
        title={title}
        sharePhotos={withPhotos ? (photos ?? []) : undefined}
        comments={comments ?? []}
      >
        {withPhotos && (
          <div data-tour="photos">
            <SessionPhotos sessionId={session.id} photos={photos ?? []} />
          </div>
        )}
      </SessionForm>
      {/* The sheets of trainings, coachings and competitions: the first one opened, then "?". */}
      {SHEET_TYPES.has(session.type) && (
        <Tour
          id="sheet"
          autoStart={!(profile?.toursSeen ?? []).includes('sheet')}
          steps={SHEET_TOUR.map((key) => ({
            target: key === 'welcome' ? undefined : key,
            title: tTour(`${key}.title`),
            body: tTour(`${key}.body`),
          }))}
        />
      )}
    </Stack>
  );
}

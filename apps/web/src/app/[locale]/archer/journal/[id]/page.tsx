import { Group, Stack, Title } from '@mantine/core';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EventIcon } from '@/components/journal/event-display';
import classes from '@/components/journal/journal.module.css';
import { SessionForm } from '@/components/journal/session-form';
import { SessionPhotos } from '@/components/journal/session-photos';
import { SESSION_TYPES } from '@/components/journal/session-types';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getArcherProfile } from '@/lib/archer-profile';

const EMPTY_SUGGESTIONS = { locations: [], distances: [], wentWell: [], toImprove: [] };

/** Session sheet (step 2 of the two-step entry). */
export default async function SessionPage({ params }: PageProps<'/[locale]/archer/journal/[id]'>) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('journal');

  const api = await getAuthedApi();
  const [{ data: session }, { data: suggestions }, { data: photos }, profile] = await Promise.all([
    api.GET('/api/v1/journal/sessions/{id}', { params: { path: { id } } }),
    api.GET('/api/v1/journal/sessions/suggestions'),
    api.GET('/api/v1/journal/sessions/{sessionId}/photos', { params: { path: { sessionId: id } } }),
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
      >
        {withPhotos && <SessionPhotos sessionId={session.id} photos={photos ?? []} />}
      </SessionForm>
    </Stack>
  );
}

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
import { getAthlete } from '@/lib/coaching';
import { getCurrentUser } from '@/lib/current-user';

const EMPTY_SUGGESTIONS = { locations: [], distances: [], wentWell: [], toImprove: [] };

/**
 * One of the archer's events, as their coach sees it: read-only, except the planning of an
 * event they planned, while it is still to come (WRITE access).
 */
export default async function CoachSessionPage({
  params,
}: PageProps<'/[locale]/coach/[archerId]/journal/[id]'>) {
  const { locale, archerId, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('journal');

  const api = await getAuthedApi();
  const path = { archerId, id };
  const [athlete, user, { data: session }, { data: suggestions }, { data: photos }] =
    await Promise.all([
      getAthlete(archerId),
      getCurrentUser(),
      api.GET('/api/v1/coach/athletes/{archerId}/sessions/{id}', { params: { path } }),
      api.GET('/api/v1/coach/athletes/{archerId}/sessions/suggestions', {
        params: { path: { archerId } },
      }),
      api.GET('/api/v1/coach/athletes/{archerId}/sessions/{id}/photos', { params: { path } }),
    ]);
  // Not one of the archer's events in their current journal (the API answers 404).
  if (!athlete?.journal || !session || !user) notFound();
  const { photos: withPhotos } = SESSION_TYPES[session.type];
  // The server's day: the API checks it again (and the sheet locks the review of future days).
  const today = new Date().toISOString().slice(0, 10);
  const canEdit =
    athlete.access === 'WRITE' && session.plannedBy?.id === user.id && session.date > today;

  const title = (
    <Group gap="sm" wrap="nowrap" align="center" h="calc(var(--step) * 2)">
      <Title order={1} className={classes.sheetTitle}>
        {session.customType?.title ?? t(`types.${session.type}`)}
      </Title>
      <EventIcon session={session} size={60} />
    </Group>
  );

  return (
    <Stack gap="sm" maw={960} mx="auto" w="100%">
      <SessionForm
        session={session}
        suggestions={suggestions ?? EMPTY_SUGGESTIONS}
        disciplines={athlete.disciplines}
        title={title}
        coach={{ archerId, canEdit, lastDay: athlete.journal.endDate }}
      >
        {withPhotos && <SessionPhotos sessionId={session.id} photos={photos ?? []} readOnly />}
      </SessionForm>
    </Stack>
  );
}

import { Group, Stack, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { EventIcon } from '@/components/journal/event-display';
import classes from '@/components/journal/journal.module.css';
import { SessionForm } from '@/components/journal/session-form';
import { SessionPhotos } from '@/components/journal/session-photos';
import { AnchorLink } from '@/components/links';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getArcherProfile } from '@/lib/archer-profile';

const EMPTY_SUGGESTIONS = { locations: [], distances: [], wentWell: [], toImprove: [] };

/** Session sheet (step 2 of the two-step entry). */
export default async function SessionPage({ params }: PageProps<'/[locale]/archer/journal/[id]'>) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('journal');
  const format = await getFormatter();

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

  // Noon, so the calendar day is the same in every time zone.
  const day = format.dateTime(new Date(`${session.date}T12:00:00`), { dateStyle: 'full' });

  /*
    The type and its icon on the left; the day, underlined, in the top right corner;
    both written on the second of the sheet's first two lines (a wrapped date: on the
    next two).
  */
  const header = (
    <Group justify="space-between" align="flex-start" className={classes.sheetHeader}>
      <Group gap="sm" wrap="nowrap" align="center" h="calc(var(--step) * 2)">
        <Title order={1} className={classes.sheetTitle}>
          {t(`types.${session.type}`)}
        </Title>
        <EventIcon session={session} size={60} />
      </Group>
      <time dateTime={session.date} className={classes.sheetDate}>
        {day}
        {session.startTime ? ` · ${session.startTime}` : ''}
      </time>
    </Group>
  );

  // The way back, then the action bar and the loose-leaf sheet (drawn by SessionForm).
  return (
    <Stack gap="sm" maw={960} mx="auto" w="100%">
      <AnchorLink href="/archer/journal" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          {t('back')}
        </Group>
      </AnchorLink>
      <SessionForm
        session={session}
        suggestions={suggestions ?? EMPTY_SUGGESTIONS}
        disciplines={profile?.disciplines ?? []}
        header={header}
      >
        <SessionPhotos sessionId={session.id} photos={photos ?? []} />
      </SessionForm>
    </Stack>
  );
}

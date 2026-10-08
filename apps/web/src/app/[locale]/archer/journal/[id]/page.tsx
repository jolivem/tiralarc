import { Group, Stack, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { SessionForm } from '@/components/journal/session-form';
import { AnchorLink } from '@/components/links';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getJournals } from '@/lib/journals';

const EMPTY_SUGGESTIONS = { locations: [], distances: [], wentWell: [], toImprove: [] };

/** Session sheet (step 2 of the two-step entry). */
export default async function SessionPage({ params }: PageProps<'/[locale]/archer/journal/[id]'>) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('journal');
  const format = await getFormatter();

  const api = await getAuthedApi();
  const [{ data: session }, { data: suggestions }, journals] = await Promise.all([
    api.GET('/api/v1/journal/sessions/{id}', { params: { path: { id } } }),
    api.GET('/api/v1/journal/sessions/suggestions'),
    getJournals(),
  ]);
  // Unknown id, or someone else's session (the API answers 404 for both).
  if (!session) notFound();

  // Noon, so the calendar day is the same in every time zone.
  const day = format.dateTime(new Date(`${session.date}T12:00:00`), { dateStyle: 'full' });

  return (
    <Stack gap="md" maw={960} mx="auto">
      <AnchorLink href="/archer/journal" size="sm">
        <Group gap={4}>
          <IconArrowLeft size={16} />
          {t('back')}
        </Group>
      </AnchorLink>
      <Title order={1} size="h2">
        {t(`types.${session.type}`)} — {day}
        {session.startTime ? ` · ${session.startTime}` : ''}
      </Title>
      <SessionForm
        session={session}
        journal={journals.find((j) => j.id === session.journalId)}
        suggestions={suggestions ?? EMPTY_SUGGESTIONS}
      />
    </Stack>
  );
}

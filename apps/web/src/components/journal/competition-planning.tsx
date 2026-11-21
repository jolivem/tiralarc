'use client';

import { Box, Button, Center, Loader, LoadingOverlay, Modal, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconCalendarPlus } from '@tabler/icons-react';
import type { CompetitionList, Journal, JournalSessionSummary } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState, useTransition } from 'react';
import { listCompetitions } from '@/app/actions/journal';
import { RuledActionCard } from '@/components/notebook/ruled-action-card';
import type { LatLng } from '@/lib/geo';
import { eventsOf } from '@/lib/journal-events';
import { CompetitionListPanel } from './competition-list';
import classes from './season-calendar.module.css';

/**
 * Home page, right page, under "Régularité": "Planification Concours", written on the
 * notebook's lines like the PDF extract, its button on the title's line. The button opens the
 * FFTA competitions still to come this season (from today to the end of the selected journal)
 * in the archer's departments and disciplines, to add to the journal; `children` (the published
 * invitations, `CompetitionsToPlan`) go under the title. Only for an archer practising in
 * France; the button is disabled once the journal's season is over.
 */
export function CompetitionPlanningCard({
  journal,
  today,
  home = null,
  children,
}: {
  journal: Pick<Journal, 'startDate' | 'endDate'>;
  /** "YYYY-MM-DD", decided by the server so both renders agree. */
  today: string;
  /** The profile's starting town, for the map's distances to travel (null: none, or not found). */
  home?: (LatLng & { name: string }) | null;
  children?: ReactNode;
}) {
  const t = useTranslations('archer.competitions');
  const tArcher = useTranslations('archer');
  const isPhone = useMediaQuery('(max-width: 48em)');
  const [opened, setOpened] = useState(false);
  /** Undefined until read; null when the API could not be reached (read again next time). */
  const [competitions, setCompetitions] = useState<CompetitionList | null | undefined>();
  const [sessions, setSessions] = useState<JournalSessionSummary[]>([]);
  const [loading, startLoading] = useTransition();
  const from = today > journal.startDate ? today : journal.startDate;
  const to = journal.endDate;

  /** The journal's events over the same days: they tell which competitions are added already. */
  const loadEvents = async () => setSessions(await eventsOf(from, to));

  const open = () => {
    setOpened(true);
    // The events are read again on each opening, so those added meanwhile show; the FFTA's
    // list (the same for the page's lifetime) once it was read.
    startLoading(async () => {
      const [list] = await Promise.all([
        competitions ? competitions : listCompetitions(from, to),
        loadEvents(),
      ]);
      setCompetitions(list);
    });
  };

  return (
    <RuledActionCard
      title={t('planningTitle')}
      highlight="peach"
      action={
        <Button
          variant="light"
          size="xs"
          leftSection={<IconCalendarPlus size={16} />}
          onClick={open}
          disabled={from > to}
        >
          {t('plan')}
        </Button>
      }
    >
      {/* Room under the heading (written on its box's last line) before the list. */}
      {children && <Box mt="md">{children}</Box>}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t('planningTitle')}
        classNames={{ title: classes.title }}
        closeButtonProps={{ 'aria-label': tArcher('close'), size: 'lg' }}
        fullScreen={isPhone}
        size="min(900px, 95vw)"
        radius="lg"
        centered
      >
        {competitions === undefined ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (
          <Stack gap="md" pos="relative">
            <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />
            <CompetitionListPanel
              list={competitions}
              sessions={sessions}
              today={today}
              onAdded={() => startLoading(loadEvents)}
              home={home}
            />
          </Stack>
        )}
      </Modal>
    </RuledActionCard>
  );
}

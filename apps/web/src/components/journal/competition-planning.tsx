'use client';

import { Button, Center, Loader, LoadingOverlay, Modal, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconCalendarPlus } from '@tabler/icons-react';
import type { CompetitionList, Journal, JournalSessionSummary } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { listCompetitions } from '@/app/actions/journal';
import exportClasses from '@/components/export/export.module.css';
import { RuledHeading } from '@/components/notebook/on-ruling';
import { RuledStack } from '@/components/notebook/ruled-stack';
import { CompetitionListPanel } from './competition-list';
import { eventsOf } from './season-calendar';
import classes from './season-calendar.module.css';

/**
 * Home page, right page, under "Mandats publiés !": "Planification Concours", written on the notebook's lines like the PDF
 * extract. Its button opens the FFTA competitions still to come this season (from today to the
 * end of the selected journal) in the archer's departments and disciplines, to add to the journal.
 * Only for an archer practising in France, while the journal's season isn't over.
 */
export function CompetitionPlanningCard({
  journal,
  today,
}: {
  journal: Pick<Journal, 'startDate' | 'endDate'>;
  /** "YYYY-MM-DD", decided by the server so both renders agree. */
  today: string;
}) {
  const t = useTranslations('archer.competitions');
  const tArcher = useTranslations('archer');
  const isPhone = useMediaQuery('(max-width: 48em)');
  const [opened, setOpened] = useState(false);
  const [competitions, setCompetitions] = useState<CompetitionList | null | undefined>();
  const [sessions, setSessions] = useState<JournalSessionSummary[]>([]);
  const [loading, startLoading] = useTransition();
  const from = today > journal.startDate ? today : journal.startDate;
  const to = journal.endDate;

  /** The journal's events over the same days: they tell which competitions are added already. */
  const loadEvents = async () => setSessions(await eventsOf(from, to));

  const open = () => {
    setOpened(true);
    // Read again on each opening, so events added meanwhile show.
    startLoading(async () => {
      const [list] = await Promise.all([listCompetitions(from, to), loadEvents()]);
      setCompetitions(list);
    });
  };

  return (
    <section>
      <RuledStack>
        <RuledHeading>{t('planningTitle')}</RuledHeading>
        <div className={exportClasses.row}>
          <p className={exportClasses.intro}>{t('planningIntro')}</p>
          <div className={exportClasses.action}>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconCalendarPlus size={16} />}
              onClick={open}
              disabled={from > to}
            >
              {t('plan')}
            </Button>
          </div>
        </div>
      </RuledStack>

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
            {from > to ? (
              <Text size="sm" c="dimmed">
                {t('empty')}
              </Text>
            ) : (
              <CompetitionListPanel
                list={competitions}
                sessions={sessions}
                today={today}
                onAdded={() => startLoading(loadEvents)}
              />
            )}
          </Stack>
        )}
      </Modal>
    </section>
  );
}

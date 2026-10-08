'use client';

import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { IconCircleCheckFilled, IconNotebook, IconPencil, IconTrash } from '@tabler/icons-react';
import type { Journal } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { useOptimistic, useState, useTransition } from 'react';
import { deleteJournal, selectJournal } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import { ButtonLink } from '@/components/links';
import type { ActionState } from '@/lib/action-state';
import classes from './journal.module.css';
import { JournalModal, NewJournalButton } from './journal-modal';

/** Formats a journal's period, e.g. "1 Sept 2026 – 31 Aug 2027". */
function useJournalPeriod() {
  const t = useTranslations('journals');
  const format = useFormatter();
  // Noon, so the calendar day is the same in every time zone.
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00`), { dateStyle: 'medium' });
  return (journal: Journal) =>
    t('period', { start: day(journal.startDate), end: day(journal.endDate) });
}

/**
 * Home dashboard card of the Journal section: the archer's journals (one per
 * season), with the selected one — the journal the Journal section opens.
 */
export function JournalsCard({
  journals,
  selectedId,
}: {
  journals: Journal[];
  selectedId: string | null;
}) {
  const t = useTranslations();
  const period = useJournalPeriod();
  const [currentId, setCurrentId] = useOptimistic(selectedId);
  const [, startSelecting] = useTransition();
  const [toEdit, setToEdit] = useState<Journal | null>(null);
  const [toDelete, setToDelete] = useState<Journal | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [deleting, startDeleting] = useTransition();

  const select = (id: string) =>
    startSelecting(async () => {
      setCurrentId(id);
      await selectJournal(id);
    });
  const closeDelete = () => {
    setToDelete(null);
    setState({});
  };

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group gap="sm" wrap="nowrap" align="flex-start" mb="md">
        <ThemeIcon variant="light" size={40} radius="md">
          <IconNotebook size={22} />
        </ThemeIcon>
        <div>
          <Text fw={600}>{t('archer.journal')}</Text>
          <Text size="sm" c="dimmed">
            {t('archer.journalIntro')}
          </Text>
        </div>
      </Group>

      {journals.length === 0 ? (
        <Text size="sm" mb="md">
          {t('journals.empty')}
        </Text>
      ) : (
        <Stack gap="xs" mb="md" role="radiogroup" aria-label={t('journals.list')}>
          {journals.map((journal) => {
            const selected = journal.id === currentId;
            return (
              <Group key={journal.id} gap={4} wrap="nowrap">
                <UnstyledButton
                  role="radio"
                  aria-checked={selected}
                  className={classes.journalRow}
                  data-selected={selected || undefined}
                  onClick={() => select(journal.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} truncate>
                      {journal.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {period(journal)} · {t('journals.sessions', { count: journal.sessionCount })}
                    </Text>
                  </div>
                  {selected && (
                    <IconCircleCheckFilled
                      size={22}
                      color="var(--mantine-primary-color-filled)"
                      aria-label={t('journals.selected')}
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </UnstyledButton>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={t('journals.editLabel', { title: journal.title })}
                  onClick={() => setToEdit(journal)}
                >
                  <IconPencil size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="lg"
                  aria-label={t('journals.deleteLabel', { title: journal.title })}
                  onClick={() => setToDelete(journal)}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            );
          })}
        </Stack>
      )}

      <Group gap="sm">
        {journals.length > 0 && (
          <ButtonLink href="/archer/journal">{t('archer.openJournal')}</ButtonLink>
        )}
        <NewJournalButton variant={journals.length > 0 ? 'light' : 'filled'} />
      </Group>

      <JournalModal
        opened={toEdit !== null}
        journal={toEdit ?? undefined}
        onClose={() => setToEdit(null)}
      />

      <Modal
        opened={toDelete !== null}
        onClose={closeDelete}
        title={<Text fw={600}>{t('journals.deleteTitle')}</Text>}
        centered
      >
        {toDelete && (
          <Stack>
            <Text size="sm">
              {t('journals.deleteBody', { title: toDelete.title })}
              {toDelete.sessionCount > 0 &&
                ` ${t('journals.deleteSessions', { count: toDelete.sessionCount })}`}
            </Text>
            <FormError state={state} />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDelete}>
                {t('journals.cancel')}
              </Button>
              <Button
                color="red"
                loading={deleting}
                onClick={() =>
                  startDeleting(async () => {
                    const result = await deleteJournal(toDelete.id);
                    if (result.code) setState(result);
                    else closeDelete();
                  })
                }
              >
                {t('journals.delete')}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Card>
  );
}

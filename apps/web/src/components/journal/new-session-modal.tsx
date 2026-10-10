'use client';

import { Button, Group, Modal, SimpleGrid, Stack, Text } from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { IconCalendar, IconClock } from '@tabler/icons-react';
import type { Journal, SessionType } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { createSession } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import { TypePicker } from './type-picker';

export interface NewSessionDefaults {
  date: string;
  time?: string;
}

/**
 * Step 1 of the two-step entry: type + date (+ optional time). Full screen on
 * phones. On success the server action redirects to the event's own form,
 * whose fields depend on the type.
 */
export function NewSessionModal({
  journal,
  defaults,
  onClose,
}: {
  journal: Journal;
  /** null = closed */
  defaults: NewSessionDefaults | null;
  onClose: () => void;
}) {
  const t = useTranslations('journal');
  const isPhone = useMediaQuery('(max-width: 48em)');

  return (
    <Modal
      opened={defaults !== null}
      onClose={onClose}
      title={<Text fw={600}>{t('newSession')}</Text>}
      fullScreen={isPhone}
      size="lg"
      centered
    >
      {/* Remount on each opening so the form starts from the clicked day. */}
      {defaults && (
        <NewSessionForm
          key={`${defaults.date}${defaults.time}`}
          journal={journal}
          defaults={defaults}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}

function NewSessionForm({
  journal,
  defaults,
  onCancel,
}: {
  journal: Journal;
  defaults: NewSessionDefaults;
  onCancel: () => void;
}) {
  const t = useTranslations('journal');
  const [type, setType] = useState<SessionType | null>(null);
  const [date, setDate] = useState<string | null>(clampToJournal(defaults.date, journal));
  const [time, setTime] = useState(defaults.time ?? '');
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!type || !date) return;
    startTransition(async () => {
      setState(await createSession({ type, date, startTime: time || null }));
    });
  };

  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        {t('newSessionHint')}
      </Text>
      <TypePicker value={type} onChange={setType} />
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <DatePickerInput
          label={t('date')}
          value={date}
          onChange={setDate}
          minDate={journal.startDate}
          maxDate={journal.endDate}
          valueFormat="dddd D MMMM YYYY"
          leftSection={<IconCalendar size={18} />}
          required
        />
        <TimeInput
          label={t('time')}
          description={t('timeHint')}
          value={time}
          onChange={(e) => setTime(e.currentTarget.value)}
          leftSection={<IconClock size={18} />}
        />
      </SimpleGrid>
      <FormError state={state} />
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button onClick={submit} loading={pending} disabled={!type || !date}>
          {t('create')}
        </Button>
      </Group>
    </Stack>
  );
}

export const today = () => dayjs().format('YYYY-MM-DD');

/** The closest day within the journal's period (YYYY-MM-DD strings compare chronologically). */
export function clampToJournal(day: string, journal: Journal): string {
  if (day < journal.startDate) return journal.startDate;
  return day > journal.endDate ? journal.endDate : day;
}

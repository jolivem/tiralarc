'use client';

import { Button, Group, Modal, SimpleGrid, Stack, Text } from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { IconCalendar, IconClock } from '@tabler/icons-react';
import type { SessionType } from '@tiralarc/api-client';
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
 * phones. On success the server action redirects to the session sheet.
 */
export function NewSessionModal({
  defaults,
  onClose,
}: {
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
          defaults={defaults}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}

function NewSessionForm({
  defaults,
  onCancel,
}: {
  defaults: NewSessionDefaults;
  onCancel: () => void;
}) {
  const t = useTranslations('journal');
  const [type, setType] = useState<SessionType | null>(null);
  const [date, setDate] = useState<string | null>(defaults.date);
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

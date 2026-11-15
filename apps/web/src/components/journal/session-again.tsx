'use client';

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar, IconRepeat } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { copySession } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import { today } from './new-session-modal';

/**
 * "Do this session again", in the action bar of the archer's own training / coaching sheet: a
 * dialog picks the day (today at first, past days not offered), then the API copies the planning (duration, place,
 * discipline, distance, objective, steps, none ticked) into a new sheet, which opens. Copied as
 * saved: offered once the changes are saved (`dirty`).
 */
export function SessionAgainButton({ sessionId, dirty }: { sessionId: string; dirty: boolean }) {
  const t = useTranslations('journal.again');
  const [opened, setOpened] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const open = () => {
    setDate(today());
    setState({});
    setOpened(true);
  };
  const confirm = () => {
    if (!date) return;
    // On success the action opens the new sheet.
    startTransition(async () => setState(await copySession(sessionId, date)));
  };

  return (
    <>
      <Button
        variant="subtle"
        leftSection={<IconRepeat size={18} />}
        onClick={open}
        disabled={dirty}
        title={dirty ? t('saveFirst') : t('hint')}
      >
        {t('button')}
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Text fw={600}>{t('title')}</Text>}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('body')}
          </Text>
          <DatePickerInput
            label={t('date')}
            value={date}
            onChange={setDate}
            // Done again from today on: past days aren't offered.
            minDate={today()}
            valueFormat="dddd D MMMM YYYY"
            leftSection={<IconCalendar size={18} />}
            required
          />
          <FormError state={state} />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setOpened(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={confirm} loading={pending} disabled={!date}>
              {t('confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

'use client';

import { Button, Group, Modal, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { IconCalendar, IconPlus } from '@tabler/icons-react';
import type { Journal } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { createJournal, updateJournal } from '@/app/actions/journal';
import { FormError, useFieldError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';

/** First month (0-based) of an archery season: 1 September – 31 August. */
const SEASON_START_MONTH = 8;

/** The season in progress, as the default period of a new journal. */
function currentSeason(): { start: string; end: string } {
  const now = dayjs();
  const startYear = now.month() >= SEASON_START_MONTH ? now.year() : now.year() - 1;
  const start = dayjs(new Date(startYear, SEASON_START_MONTH, 1));
  return {
    start: start.format('YYYY-MM-DD'),
    end: start.add(1, 'year').subtract(1, 'day').format('YYYY-MM-DD'),
  };
}

/** "New journal" button with its dialog. The new journal becomes the selected one. */
export function NewJournalButton({ variant = 'light' }: { variant?: 'light' | 'filled' }) {
  const t = useTranslations('journals');
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        leftSection={<IconPlus size={18} />}
        onClick={() => setOpened(true)}
      >
        {t('new')}
      </Button>
      <JournalModal opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}

/** Dialog creating a journal, or editing `journal` when given (full screen on phones). */
export function JournalModal({
  opened,
  journal,
  onClose,
}: {
  opened: boolean;
  journal?: Journal;
  onClose: () => void;
}) {
  const t = useTranslations('journals');
  const isPhone = useMediaQuery('(max-width: 48em)');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>{t(journal ? 'edit' : 'new')}</Text>}
      fullScreen={isPhone}
      centered
    >
      {/* Mounted on each opening so the form starts from the journal (or the defaults). */}
      {opened && <JournalForm journal={journal} onDone={onClose} />}
    </Modal>
  );
}

function JournalForm({ journal, onDone }: { journal?: Journal; onDone: () => void }) {
  const t = useTranslations('journals');
  const fieldError = useFieldError();
  const [season] = useState(currentSeason);
  const [title, setTitle] = useState(journal?.title ?? '');
  const [startDate, setStartDate] = useState<string | null>(journal?.startDate ?? season.start);
  const [endDate, setEndDate] = useState<string | null>(journal?.endDate ?? season.end);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const valid = title.trim() !== '' && startDate !== null && endDate !== null;
  const submit = () => {
    if (!valid) return;
    startTransition(async () => {
      const values = { title: title.trim(), startDate, endDate };
      const result = journal
        ? await updateJournal(journal.id, values)
        : await createJournal(values);
      if (result.code) setState(result);
      else onDone();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          {t(journal ? 'editHint' : 'newHint')}
        </Text>
        <TextInput
          label={t('title')}
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          maxLength={100}
          error={fieldError(state, 'title')}
          required
          data-autofocus
        />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <DatePickerInput
            label={t('startDate')}
            value={startDate}
            onChange={(day) => {
              setStartDate(day);
              // Keep the period valid: the end never precedes the start.
              if (day && endDate && endDate < day) setEndDate(day);
            }}
            valueFormat="D MMMM YYYY"
            leftSection={<IconCalendar size={18} />}
            error={fieldError(state, 'startDate')}
            required
          />
          <DatePickerInput
            label={t('endDate')}
            value={endDate}
            onChange={setEndDate}
            minDate={startDate ?? undefined}
            valueFormat="D MMMM YYYY"
            leftSection={<IconCalendar size={18} />}
            error={fieldError(state, 'endDate')}
            required
          />
        </SimpleGrid>
        <FormError state={state} />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onDone}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={pending} disabled={!valid}>
            {t(journal ? 'save' : 'create')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

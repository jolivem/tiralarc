'use client';

import { Alert, Button, Checkbox, Group, Modal, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar, IconFileTypePdf } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { type ExportOptions, exportQuery, MAX_EXPORT_DAYS, spanDays } from '@/lib/export-options';

type Part = 'rankings' | 'stats' | 'sheets' | 'photos';
const PARTS: Part[] = ['rankings', 'stats', 'sheets', 'photos'];

/**
 * Home page: "PDF extract", a dialog choosing the days (the selected journal's period at
 * first) and what goes with the month calendars, then the A5 PDF downloaded once printed
 * (archer/export route). The archer waits in the dialog: it takes a few seconds, more with
 * many photos.
 */
export function ExportButton({ from, to }: { from: string; to: string }) {
  const t = useTranslations('export');
  const locale = useLocale();
  const [opened, setOpened] = useState(false);
  const [days, setDays] = useState<[string | null, string | null]>([from, to]);
  const [parts, setParts] = useState<Record<Part, boolean>>({
    rankings: true,
    stats: true,
    sheets: true,
    photos: false,
  });
  const [status, setStatus] = useState<'idle' | 'working' | 'failed'>('idle');

  const [start, end] = days;
  const tooLong = start !== null && end !== null && spanDays(start, end) > MAX_EXPORT_DAYS;
  const ready = start !== null && end !== null && !tooLong;

  const generate = async () => {
    if (!ready) return;
    const options: ExportOptions = {
      from: start,
      to: end,
      ...parts,
      photos: parts.sheets && parts.photos,
    };
    setStatus('working');
    try {
      const response = await fetch(`/${locale}/archer/export?${exportQuery(options).toString()}`);
      if (!response.ok) throw new Error(String(response.status));
      const url = URL.createObjectURL(await response.blob());
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: `journal-${start}-${end}.pdf`,
      });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus('idle');
      setOpened(false);
    } catch {
      setStatus('failed');
    }
  };

  return (
    <>
      <Button
        variant="light"
        size="xs"
        leftSection={<IconFileTypePdf size={16} />}
        onClick={() => {
          setStatus('idle');
          setOpened(true);
        }}
      >
        {t('button')}
      </Button>
      <Modal
        opened={opened}
        // Not while printing: the download would be lost.
        onClose={() => status !== 'working' && setOpened(false)}
        title={<Text fw={600}>{t('title')}</Text>}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('intro')}
          </Text>
          <DatePickerInput
            type="range"
            label={t('periodLabel')}
            value={days}
            onChange={(value) => setDays(value as [string | null, string | null])}
            valueFormat="D MMM YYYY"
            leftSection={<IconCalendar size={16} />}
            error={tooLong ? t('tooLong', { max: MAX_EXPORT_DAYS }) : undefined}
            allowSingleDateInRange
          />
          <Checkbox.Group
            label={t('parts')}
            value={PARTS.filter((part) => parts[part])}
            onChange={(value) =>
              setParts(
                Object.fromEntries(PARTS.map((part) => [part, value.includes(part)])) as Record<
                  Part,
                  boolean
                >,
              )
            }
          >
            <Stack gap="xs" mt="xs">
              {PARTS.map((part) => (
                <Checkbox
                  key={part}
                  value={part}
                  label={t(part)}
                  // The photos go with their sheets.
                  disabled={part === 'photos' && !parts.sheets}
                />
              ))}
            </Stack>
          </Checkbox.Group>
          {status === 'working' && (
            <Text size="sm" c="dimmed">
              {t('generating')}
            </Text>
          )}
          {status === 'failed' && (
            <Alert color="red" variant="light">
              {t('failed')}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setOpened(false)}
              disabled={status === 'working'}
            >
              {t('cancel')}
            </Button>
            <Button
              leftSection={<IconFileTypePdf size={18} />}
              onClick={generate}
              loading={status === 'working'}
              disabled={!ready}
            >
              {t('generate')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

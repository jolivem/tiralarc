'use client';

import { Alert, Button, Checkbox, Group, Modal, SimpleGrid, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar, IconFileTypePdf } from '@tabler/icons-react';
import type { Discipline, Indicator } from '@tiralarc/api-client';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  type ExportOptions,
  exportQuery,
  INDICATORS,
  MAX_EXPORT_DAYS,
  spanDays,
} from '@/lib/export-options';

type Part = 'sheets' | 'photos';
const PARTS: Part[] = ['sheets', 'photos'];

/** The cards' titles on the Indicators page: message keys under `stats`. */
const INDICATOR_TITLES = {
  ARROWS: 'cumulativeArrows',
  DURATIONS: 'cumulativeDurations',
  SCORES: 'scores',
  EVENTS: 'events',
  PHYSICAL_FEELINGS: 'feelings.physical.title',
  MENTAL_FEELINGS: 'feelings.mental.title',
  COMPETITIONS: 'competitions',
} as const satisfies Record<Indicator, string>;

/**
 * A group of checkboxes under one that ticks or clears them all (indeterminate when only
 * some are ticked). `value` is kept in the order of `items`.
 */
function CheckboxList<T extends string>({
  label,
  items,
  value,
  onChange,
  itemLabel,
}: {
  label: string;
  items: readonly T[];
  value: T[];
  onChange: (value: T[]) => void;
  itemLabel: (item: T) => string;
}) {
  const all = value.length === items.length;
  return (
    <Stack gap="xs">
      <Checkbox
        label={label}
        checked={all}
        indeterminate={value.length > 0 && !all}
        onChange={() => onChange(all ? [] : [...items])}
      />
      <Checkbox.Group
        value={value}
        onChange={(next) => onChange(items.filter((item) => next.includes(item)))}
      >
        <Stack gap={6} pl="lg">
          {items.map((item) => (
            <Checkbox key={item} value={item} label={itemLabel(item)} size="xs" />
          ))}
        </Stack>
      </Checkbox.Group>
    </Stack>
  );
}

/**
 * Home page (export-card.tsx): "PDF extract", a dialog choosing the days (the selected journal's period at
 * first) and what goes with the month calendars: each national ranking (one per ranked
 * discipline of the archer's profile), each indicator, the sheets and their photos. Then the
 * A5 PDF downloaded once printed (archer/export route). The archer waits in the dialog: it
 * takes a few seconds, more with many photos.
 */
export function ExportButton({
  from,
  to,
  disciplines,
}: {
  from: string;
  to: string;
  /** The archer's disciplines with a national ranking, in `RANKED_DISCIPLINES` order. */
  disciplines: Discipline[];
}) {
  const t = useTranslations('export');
  const tStats = useTranslations('stats');
  const tJournal = useTranslations('journal');
  const locale = useLocale();
  const [opened, setOpened] = useState(false);
  const [days, setDays] = useState<[string | null, string | null]>([from, to]);
  const [rankings, setRankings] = useState<Discipline[]>(disciplines);
  const [indicators, setIndicators] = useState<Indicator[]>([...INDICATORS]);
  const [parts, setParts] = useState<Record<Part, boolean>>({
    sheets: true,
    photos: false,
  });
  const [status, setStatus] = useState<'idle' | 'working' | 'failed'>('idle');

  // "Indicators" ticks or clears them all, the rankings included.
  const allStats =
    indicators.length === INDICATORS.length && rankings.length === disciplines.length;
  const someStats = indicators.length > 0 || rankings.length > 0;

  const [start, end] = days;
  const tooLong = start !== null && end !== null && spanDays(start, end) > MAX_EXPORT_DAYS;
  const ready = start !== null && end !== null && !tooLong;

  const generate = async () => {
    if (!ready) return;
    const options: ExportOptions = {
      from: start,
      to: end,
      rankings,
      indicators,
      sheets: parts.sheets,
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
        size="lg"
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
          <Text size="sm" fw={500} mb={-8}>
            {t('parts')}
          </Text>
          {/* The indicators, the national ranking among them in a column of its own. */}
          <Stack gap="xs">
            <Checkbox
              label={t('stats')}
              checked={allStats}
              indeterminate={someStats && !allStats}
              onChange={() => {
                setIndicators(allStats ? [] : [...INDICATORS]);
                setRankings(allStats ? [] : disciplines);
              }}
            />
            <SimpleGrid cols={{ base: 1, xs: disciplines.length > 0 ? 2 : 1 }} pl="lg">
              <Checkbox.Group
                value={indicators}
                onChange={(next) =>
                  setIndicators(INDICATORS.filter((indicator) => next.includes(indicator)))
                }
              >
                <Stack gap={6}>
                  {INDICATORS.map((indicator) => (
                    <Checkbox
                      key={indicator}
                      value={indicator}
                      label={tStats(INDICATOR_TITLES[indicator])}
                      size="xs"
                    />
                  ))}
                </Stack>
              </Checkbox.Group>
              {disciplines.length > 0 && (
                <CheckboxList
                  label={t('rankings')}
                  items={disciplines}
                  value={rankings}
                  onChange={setRankings}
                  itemLabel={(discipline) => tJournal(`disciplines.${discipline}`)}
                />
              )}
            </SimpleGrid>
          </Stack>
          <Checkbox.Group
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
            <Stack gap="xs">
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

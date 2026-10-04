'use client';

import {
  ActionIcon,
  Alert,
  Autocomplete,
  Button,
  Card,
  Chip,
  Group,
  Modal,
  NumberInput,
  Paper,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconDeviceFloppy,
  IconMapPin,
  IconMoodEmpty,
  IconMoodHappy,
  IconMoodSad,
  IconMoodSick,
  IconTrash,
} from '@tabler/icons-react';
import type {
  Discipline,
  Feeling,
  JournalSession,
  JournalSessionUpdate,
  JournalSuggestions,
  SessionType,
} from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState, useTransition } from 'react';
import { deleteSession, saveSession } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import classes from './journal.module.css';
import { SESSION_TYPES } from './session-types';
import { TypePicker } from './type-picker';

const DISCIPLINES: Discipline[] = [
  'INDOOR',
  'TAE_NATIONAL',
  'TAE_INTERNATIONAL',
  'THREE_D',
  'FIELD',
];
const FEELINGS: { value: Feeling; icon: typeof IconMoodHappy; color: string }[] = [
  { value: 'GREAT', icon: IconMoodHappy, color: 'teal' },
  { value: 'OK', icon: IconMoodEmpty, color: 'gray' },
  { value: 'BAD', icon: IconMoodSad, color: 'orange' },
  { value: 'EXHAUSTED', icon: IconMoodSick, color: 'red' },
];
/** Usual target-archery distances, offered after the archer's own ones. */
const STANDARD_DISTANCES = [18, 25, 30, 50, 70];
const QUICK_DISTANCES = 5;
const LIST_LINES = 3;

type Values = Required<Omit<JournalSessionUpdate, 'type' | 'date' | 'wentWell' | 'toImprove'>> & {
  type: SessionType;
  date: string;
  wentWell: string[];
  toImprove: string[];
};

function initialValues(s: JournalSession): Values {
  const pad = (items: string[]) => [...items, '', '', ''].slice(0, LIST_LINES);
  return {
    type: s.type,
    date: s.date,
    startTime: s.startTime,
    durationMinutes: s.durationMinutes,
    location: s.location,
    discipline: s.discipline,
    distanceMeters: s.distanceMeters,
    arrowCount: s.arrowCount,
    score: s.score,
    objective: s.objective,
    satisfaction: s.satisfaction,
    technique: s.technique,
    description: s.description,
    physicalFeeling: s.physicalFeeling,
    mentalFeeling: s.mentalFeeling,
    wentWell: pad(s.wentWell),
    toImprove: pad(s.toImprove),
    nextTime: s.nextTime,
  };
}

/** NumberInput gives '' when emptied. */
const toNumber = (value: string | number) => (typeof value === 'number' ? value : null);
const toText = (value: string) => (value.trim() === '' ? null : value);

/**
 * Session sheet, mirroring the archer's paper sheet. Fields are controlled
 * (React resets uncontrolled ones after a server action) and saved with an
 * explicit button. Repetitive fields offer what the archer already typed.
 */
export function SessionForm({
  session,
  suggestions,
}: {
  session: JournalSession;
  suggestions: JournalSuggestions;
}) {
  const t = useTranslations('journal');
  const [values, setValues] = useState(() => initialValues(session));
  const [saved, setSaved] = useState(() => JSON.stringify(initialValues(session)));
  const [state, setState] = useState<ActionState>({});
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = JSON.stringify(values) !== saved;
  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setState({});
    setValues((v) => ({ ...v, [key]: value }));
  };
  const setLine = (list: 'wentWell' | 'toImprove', index: number, value: string) =>
    set(
      list,
      values[list].map((line, i) => (i === index ? value : line)),
    );

  const save = () =>
    startSaving(async () => {
      const snapshot = values;
      const result = await saveSession(session.id, snapshot);
      setState(result);
      if (!result.code) setSaved(JSON.stringify(snapshot));
    });

  const quickDistances = [...new Set([...suggestions.distances, ...STANDARD_DISTANCES])].slice(
    0,
    QUICK_DISTANCES,
  );
  const hasSheet = SESSION_TYPES[values.type].hasSheet;

  return (
    <Stack gap="md" pb="md">
      <Section title={t('info')}>
        <TypePicker value={values.type} onChange={(type) => set('type', type)} />
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
          <DatePickerInput
            label={t('date')}
            value={values.date}
            onChange={(date) => date && set('date', date)}
            valueFormat="ddd D MMM YYYY"
            leftSection={<IconCalendar size={18} />}
          />
          <TimeInput
            label={t('time')}
            value={values.startTime ?? ''}
            onChange={(e) => set('startTime', toText(e.currentTarget.value))}
            leftSection={<IconClock size={18} />}
          />
          <NumberInput
            label={t('duration')}
            value={values.durationMinutes ?? ''}
            onChange={(v) => set('durationMinutes', toNumber(v))}
            min={0}
            max={1440}
            step={15}
            allowDecimal={false}
          />
          {hasSheet && (
            <Autocomplete
              label={t('location')}
              placeholder={t('locationPlaceholder')}
              value={values.location ?? ''}
              onChange={(v) => set('location', toText(v))}
              data={suggestions.locations}
              leftSection={<IconMapPin size={18} />}
              limit={8}
            />
          )}
        </SimpleGrid>

        {hasSheet ? (
          <>
            <Stack gap={6}>
              <Text size="sm" fw={500}>
                {t('discipline')}
              </Text>
              <Chip.Group
                multiple={false}
                value={values.discipline ?? ''}
                onChange={(v) =>
                  set('discipline', v === values.discipline ? null : (v as Discipline))
                }
              >
                <Group gap="xs">
                  {DISCIPLINES.map((d) => (
                    <Chip
                      key={d}
                      value={d}
                      onClick={() => d === values.discipline && set('discipline', null)}
                    >
                      {t(`disciplines.${d}`)}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Stack>

            <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
              <Stack gap={6}>
                <NumberInput
                  label={t('distance')}
                  value={values.distanceMeters ?? ''}
                  onChange={(v) => set('distanceMeters', toNumber(v))}
                  min={0}
                  max={1000}
                  allowDecimal={false}
                />
                {/* One tap for the archer's usual distances. */}
                <Group gap={6}>
                  {quickDistances.map((d) => (
                    <Chip
                      key={d}
                      size="xs"
                      checked={values.distanceMeters === d}
                      onChange={() => set('distanceMeters', values.distanceMeters === d ? null : d)}
                    >
                      {d} m
                    </Chip>
                  ))}
                </Group>
              </Stack>
              <NumberInput
                label={t('arrows')}
                value={values.arrowCount ?? ''}
                onChange={(v) => set('arrowCount', toNumber(v))}
                min={0}
                max={2000}
                step={6}
                allowDecimal={false}
              />
              <NumberInput
                label={t('score')}
                value={values.score ?? ''}
                onChange={(v) => set('score', toNumber(v))}
                min={0}
                max={2000}
                allowDecimal={false}
              />
            </SimpleGrid>
          </>
        ) : (
          <Alert color={SESSION_TYPES.STRENGTH.color} variant="light">
            {t('strengthComing')}
          </Alert>
        )}
      </Section>

      {hasSheet && (
        <>
          <Section title={t('objective')}>
            <Textarea
              aria-label={t('objective')}
              value={values.objective ?? ''}
              onChange={(e) => set('objective', toText(e.currentTarget.value))}
              autosize
              minRows={2}
              maxLength={5000}
            />
          </Section>

          <Section title={t('selfAssessment')}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
              <Rating
                label={t('satisfaction')}
                notRated={t('notRated')}
                value={values.satisfaction}
                onChange={(v) => set('satisfaction', v)}
              />
              <Rating
                label={t('technique')}
                notRated={t('notRated')}
                value={values.technique}
                onChange={(v) => set('technique', v)}
              />
            </SimpleGrid>
          </Section>

          <Section title={t('description')}>
            <Textarea
              aria-label={t('description')}
              value={values.description ?? ''}
              onChange={(e) => set('description', toText(e.currentTarget.value))}
              autosize
              minRows={6}
              maxLength={5000}
            />
          </Section>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Section title={t('physical')}>
              <FeelingPicker
                label={t('physical')}
                value={values.physicalFeeling}
                onChange={(v) => set('physicalFeeling', v)}
              />
            </Section>
            <Section title={t('mental')}>
              <FeelingPicker
                label={t('mental')}
                value={values.mentalFeeling}
                onChange={(v) => set('mentalFeeling', v)}
              />
            </Section>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {(['wentWell', 'toImprove'] as const).map((list) => (
              <Section key={list} title={t(list)}>
                {values[list].map((line, index) => (
                  <Autocomplete
                    key={index}
                    aria-label={`${t(list)} ${index + 1}`}
                    value={line}
                    onChange={(v) => setLine(list, index, v)}
                    // Previously typed lines, minus those already used on this sheet.
                    data={suggestions[list].filter((s) => !values[list].includes(s))}
                    limit={8}
                    maxLength={200}
                    leftSection={
                      list === 'wentWell' ? (
                        <IconCheck size={18} color="var(--mantine-color-teal-filled)" />
                      ) : (
                        <IconArrowRight size={18} color="var(--mantine-color-orange-filled)" />
                      )
                    }
                  />
                ))}
              </Section>
            ))}
          </SimpleGrid>

          <Section title={t('nextTime')}>
            <Textarea
              aria-label={t('nextTime')}
              value={values.nextTime ?? ''}
              onChange={(e) => set('nextTime', toText(e.currentTarget.value))}
              autosize
              minRows={3}
              maxLength={5000}
            />
          </Section>
        </>
      )}

      <Paper withBorder shadow="md" p="sm" radius="md" className={classes.actionBar}>
        <Group justify="space-between" gap="sm" wrap="nowrap">
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={18} />}
            onClick={() => setConfirmDelete(true)}
          >
            {t('delete')}
          </Button>
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" c={dirty ? 'orange' : 'teal'} visibleFrom="xs">
              {dirty ? t('unsaved') : state.notice === 'saved' ? t('saved') : ''}
            </Text>
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={save}
              loading={saving}
              disabled={!dirty}
            >
              {t('save')}
            </Button>
          </Group>
        </Group>
        {state.code && (
          <Stack mt="sm">
            <FormError state={state} />
          </Stack>
        )}
      </Paper>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={<Text fw={600}>{t('deleteTitle')}</Text>}
        centered
      >
        <Stack>
          <Text size="sm">{t('deleteBody')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmDelete(false)}>
              {t('cancel')}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={() =>
                startDeleting(async () => {
                  setState(await deleteSession(session.id));
                  setConfirmDelete(false);
                })
              }
            >
              {t('delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="md">
        <Title order={2} size="h5" tt="uppercase" c="dimmed" lts={0.5}>
          {title}
        </Title>
        {children}
      </Stack>
    </Card>
  );
}

/** 0–10 slider; stays "not rated" (null) until touched. */
function Rating({
  label,
  notRated,
  value,
  onChange,
}: {
  label: string;
  notRated: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <Stack gap={8}>
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text size="sm" fw={600} c={value === null ? 'dimmed' : undefined}>
          {value === null ? notRated : `${value} / 10`}
        </Text>
      </Group>
      <Slider
        thumbLabel={label}
        min={0}
        max={10}
        step={1}
        value={value ?? 0}
        onChange={onChange}
        color={value === null ? 'gray' : undefined}
        marks={Array.from({ length: 11 }, (_, v) => ({
          value: v,
          label: v % 5 === 0 ? String(v) : undefined,
        }))}
        mb="md"
      />
    </Stack>
  );
}

/** The four faces of the paper sheet; tapping the selected one clears it. */
function FeelingPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Feeling | null;
  onChange: (value: Feeling | null) => void;
}) {
  const t = useTranslations('journal.feelings');
  return (
    <Group gap="sm" justify="space-around" role="radiogroup" aria-label={label}>
      {FEELINGS.map(({ value: feeling, icon: Icon, color }) => {
        const selected = value === feeling;
        return (
          <Stack key={feeling} gap={4} align="center">
            <ActionIcon
              role="radio"
              aria-checked={selected}
              aria-label={t(feeling)}
              size={52}
              radius="xl"
              variant={selected ? 'filled' : 'subtle'}
              color={selected ? color : 'gray'}
              className={classes.feeling}
              data-selected={selected || undefined}
              onClick={() => onChange(selected ? null : feeling)}
            >
              <Icon size={34} stroke={1.5} />
            </ActionIcon>
            <Text size="xs" c={selected ? undefined : 'dimmed'}>
              {t(feeling)}
            </Text>
          </Stack>
        );
      })}
    </Group>
  );
}

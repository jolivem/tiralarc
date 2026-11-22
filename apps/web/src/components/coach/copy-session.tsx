'use client';

import {
  Anchor,
  Button,
  Checkbox,
  Group,
  List,
  Modal,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconCalendar, IconCheck, IconRepeat, IconX } from '@tabler/icons-react';
import type { CopiedSession } from '@tiralarc/api-client';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { copySessionToAthletes } from '@/app/actions/coaching';
import { FormError } from '@/components/form-feedback';
import { tomorrow } from '@/components/journal/new-session-modal';
import { Link, useRouter } from '@/i18n/navigation';
import type { ActionState } from '@/lib/action-state';

/** An archer the coach may plan for (WRITE access, a journal of the season in progress). */
export interface CopyTarget {
  id: string;
  name: string;
  group: { id: string; name: string } | null;
  /** Their journal's last day: the latest the session can be planned for them. */
  lastDay: string;
}

/**
 * "Plan again", in the action bar of a training / coaching sheet the coach sees: a dialog picks
 * the day (from tomorrow) and the archers who get it — the one whose sheet it is ticked at
 * first, the others by name or a whole group at once (archers whose journal ends before the day
 * can't be ticked). The API plans the same planning (duration, place, discipline, distance,
 * objective, steps, none ticked) in each journal, coach-stamped; the dialog then lists what was
 * planned, with a link to each new sheet, and why it wasn't for the others.
 */
export function CoachSessionAgainButton({
  archerId,
  sessionId,
  dirty,
  targets,
}: {
  archerId: string;
  sessionId: string;
  dirty: boolean;
  targets: CopyTarget[];
}) {
  const t = useTranslations('journal.coachAgain');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [state, setState] = useState<ActionState>({});
  const [results, setResults] = useState<CopiedSession[] | null>(null);
  const [pending, startTransition] = useTransition();

  const lastDay = targets.reduce(
    (last, target) => (target.lastDay > last ? target.lastDay : last),
    '',
  );
  /** Archers whose journal still runs on the day picked. */
  const open = (target: CopyTarget) => !date || date <= target.lastDay;
  const ticked = chosen.filter((id) => targets.some((target) => target.id === id && open(target)));

  const start = () => {
    setDate(tomorrow());
    setChosen(targets.some((target) => target.id === archerId) ? [archerId] : []);
    setState({});
    setResults(null);
    setOpened(true);
  };
  const close = () => {
    setOpened(false);
    // The events just planned show in the calendars.
    if (results?.some((result) => result.sessionId)) router.refresh();
  };
  const toggle = (ids: string[], on: boolean) =>
    setChosen((current) =>
      on ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id)),
    );
  const confirm = () => {
    if (!date || ticked.length === 0) return;
    startTransition(async () => {
      const outcome = await copySessionToAthletes(archerId, sessionId, date, ticked);
      setState(outcome);
      if (outcome.results) setResults(outcome.results);
    });
  };

  // Groups by name, then the archers in none.
  const groups = [
    ...new Map(
      targets.flatMap((target) => (target.group ? [[target.group.id, target.group]] : [])) as [
        string,
        { id: string; name: string },
      ][],
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, locale));
  const sections = [
    ...groups.map((group) => ({
      key: group.id,
      name: group.name,
      members: targets.filter((target) => target.group?.id === group.id),
    })),
    {
      key: 'none',
      name: groups.length > 0 ? t('noGroup') : null,
      members: targets.filter((target) => !target.group),
    },
  ].filter((section) => section.members.length > 0);

  const archerRow = (target: CopyTarget) => (
    <Checkbox
      key={target.id}
      label={target.name}
      description={
        open(target)
          ? undefined
          : t('journalEnds', {
              date: format.dateTime(new Date(`${target.lastDay}T12:00:00`), { dateStyle: 'long' }),
            })
      }
      disabled={!open(target)}
      checked={ticked.includes(target.id)}
      onChange={(event) => toggle([target.id], event.currentTarget.checked)}
    />
  );

  return (
    <>
      <Button
        variant="subtle"
        leftSection={<IconRepeat size={18} />}
        onClick={start}
        disabled={dirty}
        title={dirty ? t('saveFirst') : t('hint')}
      >
        {t('button')}
      </Button>
      <Modal opened={opened} onClose={close} title={<Text fw={600}>{t('title')}</Text>} centered>
        {results ? (
          <Stack gap="md">
            <List spacing="xs" center>
              {results.map((result) => (
                <List.Item
                  key={result.archerId}
                  icon={
                    <ThemeIcon
                      size={22}
                      radius="xl"
                      color={result.sessionId ? 'teal' : 'red'}
                      variant="light"
                    >
                      {result.sessionId ? <IconCheck size={14} /> : <IconX size={14} />}
                    </ThemeIcon>
                  }
                >
                  {result.sessionId ? (
                    <Anchor
                      component={Link}
                      href={`/coach/${result.archerId}/journal/${result.sessionId}`}
                      onClick={() => setOpened(false)}
                    >
                      {result.name}
                    </Anchor>
                  ) : (
                    <Text span>
                      {t('failed', {
                        name: result.name,
                        reason: tErrors(result.error ?? 'INTERNAL_ERROR'),
                      })}
                    </Text>
                  )}
                </List.Item>
              ))}
            </List>
            <Group justify="flex-end">
              <Button onClick={close}>{t('close')}</Button>
            </Group>
          </Stack>
        ) : (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('body')}
            </Text>
            <DatePickerInput
              label={t('date')}
              value={date}
              onChange={setDate}
              // A coach plans days to come, within the archers' journals.
              minDate={tomorrow()}
              maxDate={lastDay || undefined}
              valueFormat="dddd D MMMM YYYY"
              leftSection={<IconCalendar size={18} />}
              required
            />
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                {t('archers')}
              </Text>
              {sections.map((section) => {
                const ids = section.members.filter(open).map((target) => target.id);
                const count = ids.filter((id) => ticked.includes(id)).length;
                return (
                  <Stack key={section.key} gap={6}>
                    {section.name && (
                      <Checkbox
                        fw={700}
                        label={section.name}
                        aria-label={t('wholeGroup', { name: section.name })}
                        disabled={ids.length === 0}
                        checked={ids.length > 0 && count === ids.length}
                        indeterminate={count > 0 && count < ids.length}
                        onChange={(event) => toggle(ids, event.currentTarget.checked)}
                      />
                    )}
                    <Stack gap={6} pl={section.name ? 'lg' : 0}>
                      {section.members.map(archerRow)}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
            <FormError state={state} />
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={close}>
                {t('cancel')}
              </Button>
              <Button onClick={confirm} loading={pending} disabled={!date || ticked.length === 0}>
                {t('confirm', { count: ticked.length })}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}

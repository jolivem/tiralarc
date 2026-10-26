'use client';

import {
  Anchor,
  Badge,
  Box,
  Button,
  CloseButton,
  Group,
  Loader,
  Menu,
  Modal,
  Stack,
  Text,
} from '@mantine/core';
import { IconChevronDown, IconExternalLink, IconPlus } from '@tabler/icons-react';
import type { Competition, CompetitionList, JournalSessionSummary } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { type ComponentProps, useEffect, useState, useTransition } from 'react';
import {
  addCompetitionToJournal,
  dismissCompetition,
  listCompetitions,
  listSessions,
} from '@/app/actions/journal';
import { AnchorLink } from '@/components/links';
import { FormError } from '@/components/form-feedback';
import { RuledHeading } from '@/components/notebook/on-ruling';
import { Link } from '@/i18n/navigation';
import type { ActionState } from '@/lib/action-state';
import classes from './journal.module.css';
import { DISCIPLINE_COLORS } from './session-types';

/** One competition is added at most this many times on one day (as the API allows). */
const MAX_PER_COMPETITION_DAY = 2;

/** Noon, so the calendar day is the same in every time zone. */
const noon = (day: string) => new Date(`${day}T12:00:00`);

/** Every day of a competition, "YYYY-MM-DD". */
export function competitionDays(competition: Competition): string[] {
  const days: string[] = [];
  for (
    let day = dayjs(competition.startDate);
    !day.isAfter(competition.endDate, 'day');
    day = day.add(1, 'day')
  ) {
    days.push(day.format('YYYY-MM-DD'));
  }
  return days;
}

/** Who adds competitions to which journal: the archer to their own, or their coach. */
export interface CompetitionAdding {
  /** Adds one day of a competition; null = read only (a coach without write access). */
  add: ((competition: Competition, day: string) => Promise<ActionState & { id?: string }>) | null;
  /** The first day a competition may be added on: today, or tomorrow for a coach. */
  firstDay: string;
  /** Where the journal's sheets are: "/archer", or "/coach/<archerId>". */
  sheetBase: string;
}

/** The archer adding to their own journal, from `today` on. */
export const ownJournal = (today: string): CompetitionAdding => ({
  add: addCompetitionToJournal,
  firstDay: today,
  sheetBase: '/archer',
});

/**
 * FFTA competitions, one per row: their dates, name, club, discipline, links to the FFTA's page
 * and the invitation, and "Add to my journal", which plans a competition event on one of their
 * days still to come — twice a day at most for one competition; other competitions of that day
 * stay free. Once added, "In the journal" leads to the (first) event's sheet.
 */
function CompetitionItems({
  competitions,
  sessions,
  adding: { add: addTo, firstDay, sheetBase },
  onAdded,
  openIn,
  onDismiss,
}: {
  /** A black cross in each row's top right corner: "I won't take part" (asked by the caller). */
  onDismiss?: (competition: Competition) => void;
  competitions: Competition[];
  sessions: JournalSessionSummary[];
  adding: CompetitionAdding;
  /** After an event was added: the calendar reloads the journal's events. */
  onAdded: () => void;
  /**
   * Instead of the buttons: the dates and the name lead there (the Journal on the competition's
   * month, its dialog open, which adds it).
   */
  openIn?: (competition: Competition) => ComponentProps<typeof Link>['href'];
}) {
  const t = useTranslations('archer.competitions');
  const tJournal = useTranslations('journal');
  const format = useFormatter();
  const [state, setState] = useState<ActionState>({});
  const [adding, startAdding] = useTransition();

  const dates = (c: Competition) =>
    c.startDate === c.endDate
      ? format.dateTime(noon(c.startDate), { weekday: 'short', day: 'numeric', month: 'short' })
      : format.dateTimeRange(noon(c.startDate), noon(c.endDate), {
          day: 'numeric',
          month: 'short',
        });
  const dayLabel = (day: string) =>
    format.dateTime(noon(day), { weekday: 'long', day: 'numeric', month: 'long' });
  /** Its discipline (in the discipline's pastel), para, teams only, postponed / cancelled. */
  const badges = (c: Competition) => (
    <>
      <Badge size="sm" variant="light" color={DISCIPLINE_COLORS[c.discipline]}>
        {tJournal(`disciplines.${c.discipline}`)}
      </Badge>
      {c.para && (
        <Badge size="sm" variant="light" color="blue">
          {t('para')}
        </Badge>
      )}
      {c.teamOnly && (
        <Badge size="sm" variant="light" color="gray">
          {t('teamOnly')}
        </Badge>
      )}
      {c.status !== 'SCHEDULED' && (
        <Badge size="sm" variant="filled" color={c.status === 'CANCELLED' ? 'red' : 'yellow'}>
          {t(`status.${c.status}`)}
        </Badge>
      )}
    </>
  );
  const add = (competition: Competition, day: string) =>
    startAdding(async () => {
      if (!addTo) return;
      const result = await addTo(competition, day);
      setState(result);
      if (result.id) onAdded();
    });

  return (
    <>
      <FormError state={state} />
      <Stack gap={0} component="ul" className={classes.competitionList}>
        {competitions.map((c) => {
          // The journal's events added from it, and how many on each day.
          const added = sessions.filter((s) => s.fftaCompetitionId === c.id);
          const addedOn = (day: string) => added.filter((s) => s.date === day).length;
          // Only a competition still on: its days to come, each until added twice.
          const days =
            addTo && c.status === 'SCHEDULED'
              ? competitionDays(c).filter(
                  (day) => day >= firstDay && addedOn(day) < MAX_PER_COMPETITION_DAY,
                )
              : [];
          const addLabel = (day: string) =>
            t(addedOn(day) > 0 ? 'addAgainOn' : 'addOn', { date: dayLabel(day) });
          const href = openIn?.(c);
          const title = (
            <Text fw={600} size="sm" td={c.status === 'CANCELLED' ? 'line-through' : undefined}>
              {c.title}
            </Text>
          );
          return (
            <li
              key={c.id}
              className={classes.competitionItem}
              data-dismissable={onDismiss ? true : undefined}
            >
              {onDismiss && (
                <CloseButton
                  size="sm"
                  className={classes.competitionDismiss}
                  aria-label={t('dismiss', { title: c.title })}
                  title={t('dismiss', { title: c.title })}
                  onClick={() => onDismiss(c)}
                />
              )}
              {href ? (
                <Link
                  href={href}
                  className={`${classes.competitionDates} ${classes.competitionLink}`}
                >
                  {dates(c)}
                </Link>
              ) : (
                <div className={classes.competitionDates}>{dates(c)}</div>
              )}
              <Stack gap={4} className={classes.competitionBody}>
                {href ? (
                  // The name, its labels on the right, level with it (the dialog has the links).
                  <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
                    <Link href={href} className={classes.competitionLink}>
                      {title}
                    </Link>
                    <Group gap={6} wrap="nowrap">
                      {badges(c)}
                    </Group>
                  </Group>
                ) : (
                  title
                )}
                {(c.organizer || c.city) && (
                  <Text size="xs" c="dimmed">
                    {[c.organizer, c.city].filter(Boolean).join(' · ')}
                  </Text>
                )}
                {!href && (
                  <Group gap={6}>
                    {badges(c)}
                    <Anchor href={c.url} target="_blank" rel="noopener noreferrer" size="xs">
                      {t('fftaPage')} <IconExternalLink size={12} style={{ verticalAlign: -1 }} />
                    </Anchor>
                    {c.mandateUrl && (
                      <Anchor
                        href={c.mandateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="xs"
                      >
                        {t('mandate')} <IconExternalLink size={12} style={{ verticalAlign: -1 }} />
                      </Anchor>
                    )}
                  </Group>
                )}
              </Stack>
              {!href && (
                <Group gap={6} justify="flex-end" className={classes.competitionAction}>
                  {added[0] && (
                    <Button
                      component={Link}
                      href={`${sheetBase}/journal/${added[0].id}`}
                      size="xs"
                      variant="light"
                      title={t('openSheet')}
                    >
                      {added.length > 1
                        ? t('inJournalMany', { count: added.length })
                        : t('inJournal')}
                    </Button>
                  )}
                  {days.length === 1 ? (
                    <Button
                      size="xs"
                      variant="default"
                      leftSection={<IconPlus size={14} />}
                      loading={adding}
                      title={addLabel(days[0]!)}
                      onClick={() => add(c, days[0]!)}
                    >
                      {t(added.length > 0 ? 'addAgain' : 'add')}
                    </Button>
                  ) : days.length > 1 ? (
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <Button
                          size="xs"
                          variant="default"
                          leftSection={<IconPlus size={14} />}
                          rightSection={<IconChevronDown size={14} />}
                          loading={adding}
                        >
                          {t(added.length > 0 ? 'addAgain' : 'add')}
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {days.map((day) => (
                          <Menu.Item key={day} onClick={() => add(c, day)}>
                            {addLabel(day)}
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  ) : null}
                </Group>
              )}
            </li>
          );
        })}
      </Stack>
    </>
  );
}

/** The season calendar's list: the upcoming FFTA competitions of the archer's departments. */
export function CompetitionListPanel({
  list,
  sessions,
  today,
  onAdded,
}: {
  /** Null: the API could not be reached. */
  list: CompetitionList | null;
  sessions: JournalSessionSummary[];
  today: string;
  onAdded: () => void;
}) {
  const t = useTranslations('archer.competitions');

  if (!list) return <FormError state={{ code: 'NETWORK_ERROR' }} />;
  if (list.departments.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t('noDepartment')}{' '}
        <AnchorLink href="/archer/profile" size="sm">
          {t('setUp')}
        </AnchorLink>
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="baseline" gap="xs">
        <Text fw={700} className={classes.monthName}>
          {/* One department in full ("78 - Yvelines"), several by their codes ("78, 91"). */}
          {t('title', {
            departments:
              list.departments.length === 1
                ? `${list.departments[0]!.code} - ${list.departments[0]!.name}`
                : list.departments.map((d) => d.code).join(', '),
          })}
        </Text>
        <Text size="xs" c="dimmed">
          <span className={classes.competitionMark} aria-hidden />
          {t('source')}
        </Text>
      </Group>
      {!list.complete && (
        <Text size="sm" c="orange">
          {t('incomplete')}
        </Text>
      )}
      {list.competitions.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('empty')}
        </Text>
      ) : (
        <CompetitionItems
          competitions={list.competitions}
          sessions={sessions}
          adding={ownJournal(today)}
          onAdded={onAdded}
        />
      )}
    </Stack>
  );
}

/** How far ahead, and how many, the home page's competitions to plan. */
const TO_PLAN_DAYS = 120;
const TO_PLAN_COUNT = 5;

/**
 * Home page, right page: the next FFTA competitions of the archer's departments and disciplines
 * still to plan — scheduled, their invitation published, not in the journal yet. Their dates
 * and name open the Journal on the competition's month with its dialog, where it is added
 * (then it leaves this list). Loaded once shown, like the national rankings.
 */
export function CompetitionsToPlan({ today }: { today: string }) {
  const t = useTranslations('archer.competitions');
  const [loaded, setLoaded] = useState<{
    list: CompetitionList | null;
    sessions: JournalSessionSummary[];
  }>();
  useEffect(() => {
    let current = true;
    const to = dayjs(today).add(TO_PLAN_DAYS, 'day').format('YYYY-MM-DD');
    Promise.all([listCompetitions(today, to), listSessions(today, to)]).then(([list, sessions]) => {
      if (current) setLoaded({ list, sessions });
    });
    return () => {
      current = false;
    };
  }, [today]);
  // "I won't take part": asked first, then left out at once (the API keeps it).
  const [dismissing, setDismissing] = useState<Competition | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [dismissState, setDismissState] = useState<ActionState>({});
  const [confirming, startConfirming] = useTransition();
  const confirmDismiss = () =>
    startConfirming(async () => {
      if (!dismissing) return;
      const result = await dismissCompetition(dismissing.id);
      setDismissState(result);
      if (result.code) return;
      setDismissed((ids) => [...ids, dismissing.id]);
      setDismissing(null);
    });

  const body = () => {
    if (!loaded) return <Loader size="sm" aria-label={t('toPlanLoading')} />;
    const { list, sessions } = loaded;
    if (!list) return <FormError state={{ code: 'NETWORK_ERROR' }} />;
    if (list.departments.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          {t('noDepartment')}{' '}
          <AnchorLink href="/archer/profile" size="sm">
            {t('setUp')}
          </AnchorLink>
        </Text>
      );
    }
    const added = new Set(
      sessions.flatMap((s) => (s.fftaCompetitionId ? [s.fftaCompetitionId] : [])),
    );
    // Only those whose invitation (mandat) is out: the archer can enter them; not those they
    // said they won't take part in.
    const toPlan = list.competitions
      .filter(
        (c) =>
          c.status === 'SCHEDULED' &&
          c.mandateUrl !== null &&
          !added.has(c.id) &&
          !c.dismissed &&
          !dismissed.includes(c.id),
      )
      .slice(0, TO_PLAN_COUNT);
    if (toPlan.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          {t('toPlanNone')}
        </Text>
      );
    }
    return (
      <CompetitionItems
        competitions={toPlan}
        sessions={sessions}
        adding={ownJournal(today)}
        onAdded={() => {}}
        // Its first day to come, in the Journal: the month shown, the competition's dialog open.
        openIn={(c) => {
          const day = c.startDate > today ? c.startDate : today;
          return { pathname: '/archer/journal', query: { month: day.slice(0, 7), day } };
        }}
        onDismiss={(c) => {
          setDismissState({});
          setDismissing(c);
        }}
      />
    );
  };

  return (
    <section>
      <RuledHeading>{t('toPlan')}</RuledHeading>
      {/* Room under the heading (written on its box's last line) before the list. */}
      <Box mt="md">{body()}</Box>
      <Modal
        opened={dismissing !== null}
        onClose={() => setDismissing(null)}
        title={t('dismissTitle')}
        radius="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t('dismissBody', { title: dismissing?.title ?? '' })}</Text>
          <FormError state={dismissState} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDismissing(null)}>
              {t('dismissCancel')}
            </Button>
            <Button color="red" loading={confirming} onClick={confirmDismiss}>
              {t('dismissConfirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </section>
  );
}

/** The FFTA competitions of one day of the month calendar, opened from that day. */
export function CompetitionsModal({
  day,
  competitions,
  sessions,
  adding,
  onClose,
  onAdded,
}: {
  /** "YYYY-MM-DD"; null = closed. */
  day: string | null;
  competitions: Competition[];
  sessions: JournalSessionSummary[];
  adding: CompetitionAdding;
  onClose: () => void;
  onAdded: () => void;
}) {
  const t = useTranslations('archer.competitions');
  const format = useFormatter();
  const shown = day ? competitions.filter((c) => c.startDate <= day && c.endDate >= day) : [];
  return (
    <Modal
      opened={day !== null && shown.length > 0}
      onClose={onClose}
      title={
        day &&
        t('dayTitle', {
          date: format.dateTime(noon(day), { weekday: 'long', day: 'numeric', month: 'long' }),
        })
      }
      size="lg"
      radius="lg"
      centered
    >
      <Stack gap="xs">
        <CompetitionItems
          competitions={shown}
          sessions={sessions}
          adding={adding}
          onAdded={onAdded}
        />
        <Text size="xs" c="dimmed">
          {t('source')}
        </Text>
      </Stack>
    </Modal>
  );
}

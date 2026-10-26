'use client';

import {
  ActionIcon,
  Box,
  Button,
  Group,
  LoadingOverlay,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { Schedule, type ScheduleEventData } from '@mantine/schedule';
import { IconPalette, IconPlus } from '@tabler/icons-react';
import type {
  CoachAccess,
  Competition,
  CustomEventType,
  Journal,
  JournalSessionSummary,
} from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useState, useTransition } from 'react';
import {
  addCompetitionToAthleteJournal,
  listAthleteCompetitions,
  listAthleteSessions,
} from '@/app/actions/coaching';
import { listCompetitions, listSessions } from '@/app/actions/journal';
import { useRouter } from '@/i18n/navigation';
import { CalendarFrame } from './calendar-frame';
import {
  type CompetitionAdding,
  competitionDays,
  CompetitionsModal,
  ownJournal,
} from './competition-list';
import { ColoringToolbar, DEFAULT_COLOR } from './coloring-toolbar';
import { MonthThemeModal, monthTheme } from './month-theme-modal';
import { eventDisplay, pendingReason } from './event-display';
import { EventLegend } from './event-legend';
import classes from './journal.module.css';
import {
  clampToJournal,
  type NewSessionDefaults,
  NewSessionModal,
  today,
} from './new-session-modal';
import { SESSION_TYPES } from './session-types';
import { MonthSummary } from './month-summary';
import { MonthTitle, titleFills, useLettering } from './month-title';
import { useMonthColoring } from './use-month-coloring';

/**
 * Days to load for the visible month (the calendar shows no other month's days), kept
 * within the journal's period: its events are those dated within it.
 * Null when the month is entirely outside the period.
 */
function visibleRange(date: string, journal: Journal): { from: string; to: string } | null {
  const d = dayjs(date);
  const from = d.startOf('month').format('YYYY-MM-DD');
  const to = d.endOf('month').format('YYYY-MM-DD');
  if (to < journal.startDate || from > journal.endDate) return null;
  return {
    from: from < journal.startDate ? journal.startDate : from,
    to: to > journal.endDate ? journal.endDate : to,
  };
}

/** The 1st of the month `offset` months after the one of `date` ("YYYY-MM-DD"). */
const addMonth = (date: string, offset: number) =>
  dayjs(date).add(offset, 'month').startOf('month').format('YYYY-MM-DD');

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** A phone-view entry: one of the journal's events, or an FFTA competition. */
type EventPayload = { session?: JournalSessionSummary; competition?: Competition };

/** Calendar entries: an event is a day's entry (no time), shown as an all-day event. */
function toEvent(session: JournalSessionSummary, title: string): ScheduleEventData<EventPayload> {
  return {
    id: session.id,
    title,
    start: `${session.date} 00:00:00`,
    end: dayjs(session.date).add(1, 'day').format('YYYY-MM-DD 00:00:00'),
    color: eventDisplay(session).color,
    payload: { session },
  };
}

/** An FFTA competition in the phone view: all its days. */
function toCompetitionEvent(competition: Competition): ScheduleEventData<EventPayload> {
  return {
    id: `ffta-${competition.id}`,
    title: competition.title,
    start: `${competition.startDate} 00:00:00`,
    end: dayjs(competition.endDate).add(1, 'day').format('YYYY-MM-DD 00:00:00'),
    color: 'yellow',
    payload: { competition },
  };
}

type DayPayload = { day: string; sessions: JournalSessionSummary[]; competitions: Competition[] };

/**
 * One all-day entry per day with events (in the order they were entered) or FFTA competitions,
 * for the month view.
 */
function toDayEvents(
  sessions: JournalSessionSummary[],
  competitionsByDay: Map<string, Competition[]>,
  labelOf: (session: JournalSessionSummary) => string,
): ScheduleEventData<DayPayload>[] {
  const byDay = new Map<string, JournalSessionSummary[]>();
  for (const session of sessions)
    byDay.set(session.date, [...(byDay.get(session.date) ?? []), session]);
  for (const day of competitionsByDay.keys()) if (!byDay.has(day)) byDay.set(day, []);
  return [...byDay].map(([day, list]) => {
    const competitions = competitionsByDay.get(day) ?? [];
    return {
      id: `day-${day}`,
      title: [...list.map(labelOf), ...competitions.map((c) => c.title)].join(', '),
      start: `${day} 00:00:00`,
      end: dayjs(day).add(1, 'day').format('YYYY-MM-DD 00:00:00'),
      color: 'gray',
      payload: { day, sessions: list, competitions },
    };
  });
}

/** A coach in one of their archers' journals. */
export interface CoachView {
  archerId: string;
  access: CoachAccess;
}

/**
 * One journal: "New event" button + month calendar + quick-add dialog. Opens on
 * `month` ("YYYY-MM") when given — today within it, otherwise its 1st.
 * With `coach`, the archer's journal as their coach sees it: no decorating; with WRITE
 * access, events can be planned after today.
 */
export function JournalView({
  journal,
  customTypes,
  month: initialMonth,
  competitionDay: initialCompetitionDay,
  coach,
}: {
  journal: Journal;
  /** The archer's own event types (new-event dialog, legend). */
  customTypes: CustomEventType[];
  month?: string;
  /** "YYYY-MM-DD": open that day's FFTA competitions dialog (in `month`). */
  competitionDay?: string;
  coach?: CoachView;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const base = coach ? `/coach/${coach.archerId}` : '/archer';
  const canPlan = !coach || coach.access === 'WRITE';
  const archerId = coach?.archerId;
  // A past or future season opens on its closest day rather than on an empty month.
  const [date, setDate] = useState(() => {
    const day = initialMonth && !today().startsWith(initialMonth) ? `${initialMonth}-01` : today();
    return clampToJournal(day, journal);
  });
  const [sessions, setSessions] = useState<JournalSessionSummary[]>([]);
  // The events are loaded in the browser, so its clock decides which days are still to come.
  const todayDate = today();
  const [loading, startLoading] = useTransition();
  const [newSession, setNewSession] = useState<NewSessionDefaults | null>(null);

  /** Day selected in the phone month view (larger screens open the dialog on a day click). */
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickingTheme, setPickingTheme] = useState(false);
  /** Displayed month, "YYYY-MM": each month has its own decoration. */
  const month = date.slice(0, 7);

  const theme = monthTheme(journal, month);
  const coloring = useMonthColoring(journal, month, theme);
  const [coloringOn, setColoringOn] = useState(false);
  const [tool, setTool] = useState<string>(DEFAULT_COLOR);
  // The month's name can always be coloured; its decoration too, when it has one.
  const isColoring = coloringOn;
  const coloringStatus =
    coloring.status === 'saving'
      ? t('journals.coloring.saving')
      : coloring.status === 'saved'
        ? t('journals.coloring.saved')
        : coloring.status === 'idle' || coloring.status === undefined
          ? ''
          : t(`errors.${coloring.status}`);

  // "Octobre": the calendar's heading, drawn without the year (screen readers get it).
  const monthDate = new Date(`${month}-15T12:00:00`);
  const monthName = capitalize(format.dateTime(monthDate, { month: 'long' }));
  const monthLabel = capitalize(format.dateTime(monthDate, { month: 'long', year: 'numeric' }));
  const lettering = useLettering(monthName);
  // One colour for the whole name (chosen in the decoration dialog), or none.
  const titleColors = new Set(
    coloring.fills.filter((fill) => fill.band === 'title').map((fill) => fill.color),
  );
  const titleColor = titleColors.size === 1 ? [...titleColors][0]! : null;
  const colorTitle = (color: string | null) => {
    if (!lettering) return;
    const others = coloring.fills.filter((fill) => fill.band !== 'title');
    coloring.change(color ? [...others, ...titleFills(lettering, color)] : others);
    // Saved at once: choosing another decoration next must not lose it.
    coloring.flush();
  };

  const range = visibleRange(date, journal);
  const from = range?.from;
  const to = range?.to;
  // Reloaded when a custom type changes too: its events carry its title, colour and pictogram.
  const typesKey = JSON.stringify(customTypes);
  /** Bumped when a competition was added: the month's events are read again. */
  const [reloads, setReloads] = useState(0);
  useEffect(() => {
    startLoading(async () => {
      if (!from || !to) return setSessions([]);
      setSessions(
        archerId ? await listAthleteSessions(archerId, from, to) : await listSessions(from, to),
      );
    });
  }, [from, to, typesKey, archerId, reloads]);

  // The FFTA competitions of the archer's departments still to come in the month (the archer's
  // profile decides which), for the archer and for their coach.
  const [loadedCompetitions, setLoadedCompetitions] = useState<{
    range: string;
    list: Competition[];
  } | null>(null);
  // Opened on a day's competitions when asked (it shows once they are loaded).
  const [competitionDay, setCompetitionDay] = useState<string | null>(
    initialCompetitionDay ?? null,
  );
  const competitionsFrom = from && from < todayDate ? todayDate : from;
  const competitionRange =
    competitionsFrom && to && competitionsFrom <= to ? `${competitionsFrom}:${to}` : null;
  useEffect(() => {
    if (!competitionRange) return;
    const [rangeFrom, rangeTo] = competitionRange.split(':') as [string, string];
    let current = true;
    (archerId
      ? listAthleteCompetitions(archerId, rangeFrom, rangeTo)
      : listCompetitions(rangeFrom, rangeTo)
    ).then((list) => {
      if (current)
        setLoadedCompetitions({ range: competitionRange, list: list?.competitions ?? [] });
    });
    return () => {
      current = false;
    };
  }, [competitionRange, archerId]);
  // Who adds them: the archer from today on; their coach, with write access, from tomorrow on,
  // as planned events (which carry the coach's stamp).
  const tomorrowDate = dayjs(todayDate).add(1, 'day').format('YYYY-MM-DD');
  const competitionAdding: CompetitionAdding = archerId
    ? {
        add: canPlan
          ? (competition, day) => addCompetitionToAthleteJournal(archerId, competition, day)
          : null,
        firstDay: tomorrowDate,
        sheetBase: base,
      }
    : ownJournal(todayDate);
  // The displayed month's only; postponed and cancelled ones are only listed below the season
  // calendar.
  const shownCompetitions =
    loadedCompetitions && loadedCompetitions.range === competitionRange
      ? loadedCompetitions.list.filter((c) => c.status === 'SCHEDULED')
      : [];
  const competitionsByDay = new Map<string, Competition[]>();
  for (const competition of shownCompetitions) {
    for (const day of competitionDays(competition)) {
      if (day.startsWith(month)) {
        competitionsByDay.set(day, [...(competitionsByDay.get(day) ?? []), competition]);
      }
    }
  }

  /** A coach plans days after today only. */
  const plannable = (day: string) => canPlan && (!coach || day > todayDate);
  const openNewSession = (day: string) => {
    if (!canPlan) return;
    const tomorrow = dayjs(todayDate).add(1, 'day').format('YYYY-MM-DD');
    setNewSession({ date: plannable(day) ? day : tomorrow });
  };

  /**
   * An "other" event is its title (or its text), a custom one its type's title; a session is its
   * type, with its score or place.
   */
  const labelOf = (session: JournalSessionSummary) => {
    const note =
      SESSION_TYPES[session.type].form === 'note' &&
      (session.title || session.description?.split('\n')[0]);
    const parts = [note || session.customType?.title || t(`journal.typesShort.${session.type}`)];
    if (session.score !== null) parts.push(String(session.score));
    else if (session.location) parts.push(session.location);
    return parts.join(' · ');
  };
  // The phone view lists events one by one; the large month view shows one entry per day.
  const events = [
    ...sessions.map((session) => toEvent(session, labelOf(session))),
    ...shownCompetitions.map(toCompetitionEvent),
  ];
  // For the month view only: Schedule spreads `monthViewProps` after its own props, so these
  // replace its events there. (Its types leave `events` out of monthViewProps, hence the
  // separate object, spread in.)
  const perDay = {
    events: toDayEvents(sessions, competitionsByDay, labelOf),
    maxEventsPerDay: 1,
  };
  // The loaded events are the displayed month's (within the journal).
  const monthArrows = sessions.reduce((sum, session) => sum + (session.arrowCount ?? 0), 0);

  return (
    <div>
      {/*
        In the page's top corners, outside the narrower calendar: "Today" left, the rest right;
        between them, centred, the month's arrows and satisfaction (a month of the journal).
      */}
      <div className={classes.pageActions}>
        <Button variant="default" size="sm" onClick={() => setDate(today())}>
          {t('schedule.today')}
        </Button>
        {range && (
          <MonthSummary journal={journal} month={month} arrows={monthArrows} readOnly={!!coach} />
        )}
        <Group gap="xs" className={classes.pageActionsEnd}>
          <EventLegend customTypes={customTypes} />
          {/* The decoration is the archer's own. */}
          {!coach && (
            <Tooltip label={t('journals.theme')}>
              <ActionIcon
                variant="default"
                size="lg"
                aria-label={t('journals.theme')}
                onClick={() => setPickingTheme(true)}
              >
                <IconPalette size={18} />
              </ActionIcon>
            </Tooltip>
          )}
          {canPlan && (
            <Tooltip label={t(coach ? 'coach.planSession' : 'journal.newSession')}>
              <ActionIcon
                size="lg"
                aria-label={t(coach ? 'coach.planSession' : 'journal.newSession')}
                // The day picked in the calendar when there is one (phones select a day by tapping
                // it), otherwise the calendar's own day: today, or a day of the month navigated to.
                onClick={() => openNewSession(pickedDay?.startsWith(month) ? pickedDay : date)}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </div>
      <Box pos="relative" className={classes.calendarWidth}>
        <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} loaderProps={{ size: 'sm' }} />
        {isColoring && (
          <ColoringToolbar
            tool={tool}
            onToolChange={setTool}
            canUndo={coloring.canUndo}
            onUndo={coloring.undo}
            canClear={coloring.fills.length > 0}
            onClear={() => coloring.change([])}
            onDone={() => {
              coloring.flush();
              setColoringOn(false);
            }}
            status={coloringStatus}
          />
        )}
        <CalendarFrame
          theme={theme}
          fills={coloring.fills}
          tool={isColoring ? tool : null}
          onFillsChange={coloring.change}
        >
          <div className={classes.calendarScale}>
            <MonthTitle
              label={monthLabel}
              art={lettering}
              fills={coloring.fills}
              tool={isColoring ? tool : null}
              onFillsChange={coloring.change}
              onPrevious={() => setDate(addMonth(date, -1))}
              onNext={() => setDate(addMonth(date, 1))}
              labels={{ previous: t('schedule.previous'), next: t('schedule.next') }}
            />
            <Schedule
              layout="responsive"
              date={date}
              onDateChange={setDate}
              // Month only: no day / week / year views, so no view selector either.
              view="month"
              // Only the month's own days: the previous and next months' cells stay blank.
              // Its heading is MonthTitle, above.
              monthViewProps={{
                withHeader: false,
                withOutsideDays: false,
                classNames: {
                  monthViewDay: classes.monthDay,
                  monthViewWeekday: classes.weekday,
                  monthViewDayLabel: classes.dayLabel,
                },
                // One entry per day, filling the room under the day's number: its events
                // (up to 4) as their icon alone, as large as they fit — one in
                // the middle, two side by side, three or four in a square. Each opens its
                // event; a click beside them adds one on that day. (The phone view keeps
                // its list of names: it gets the events one by one.)
                ...perDay,
                renderEvent: (event, props) => {
                  const payload = event.payload as DayPayload | undefined;
                  const day = payload?.sessions ?? [];
                  const held = payload?.competitions ?? [];
                  const heldLabel = t('archer.competitions.dayMark', {
                    names: held.map((c) => c.title).join(', '),
                  });
                  return (
                    <div className={classes.dayDots} style={props.style} data-count={day.length}>
                      {held.length > 0 && payload && (
                        // A ticket in the cell's corner: the day's FFTA competitions.
                        <UnstyledButton
                          className={classes.competitionTicket}
                          title={heldLabel}
                          aria-label={heldLabel}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompetitionDay(payload.day);
                          }}
                        >
                          {t('archer.competitions.ticket')}
                        </UnstyledButton>
                      )}
                      {day.map((session) => {
                        const { color, icon: Icon } = eventDisplay(session);
                        // Greyed until its review is written, or (no review) until its day.
                        const pending = pendingReason(session, todayDate);
                        // Planned by the coach: stamped until the archer completes it.
                        const stamped = session.plannedByCoach && pending !== null;
                        const notes = [
                          ...(pending ? [t(`journal.${pending}`)] : []),
                          ...(stamped ? [t('journal.plannedByCoach')] : []),
                        ];
                        const label = notes.length
                          ? `${labelOf(session)} (${notes.join(', ')})`
                          : labelOf(session);
                        return (
                          <div key={session.id} className={classes.dotCell}>
                            <UnstyledButton
                              className={classes.dot}
                              style={
                                {
                                  '--dot-color': `var(--mantine-color-${color}-filled)`,
                                } as CSSProperties
                              }
                              title={label}
                              aria-label={label}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`${base}/journal/${session.id}`);
                              }}
                            >
                              <Icon
                                size="100%"
                                color="var(--dot-color)"
                                className={pending ? classes.pendingIcon : undefined}
                              />
                              {stamped && (
                                <span className={classes.coachStamp} aria-hidden>
                                  {t('journal.coachStamp')}
                                </span>
                              )}
                            </UnstyledButton>
                          </div>
                        );
                      })}
                    </div>
                  );
                },
              }}
              events={events}
              // Not mode="static": @mantine/schedule 9.6.3 then leaks `withEventResize` to the DOM.
              onEventClick={(event) => {
                const competition = (event.payload as EventPayload | undefined)?.competition;
                if (!competition) return router.push(`${base}/journal/${event.id}`);
                // The day tapped on the phone, when it is one of the competition's.
                const tapped =
                  pickedDay &&
                  pickedDay >= competition.startDate &&
                  pickedDay <= competition.endDate;
                setCompetitionDay(tapped ? pickedDay : competition.startDate);
              }}
              onDayClick={(day) => {
                const clicked = dayjs(day).format('YYYY-MM-DD');
                if (plannable(clicked)) setNewSession({ date: clicked });
              }}
              renderEventBody={(event) => {
                const session = (event.payload as EventPayload | undefined)?.session;
                const Icon = session ? eventDisplay(session).icon : null;
                const pending = session ? pendingReason(session, todayDate) : null;
                if (!session) {
                  return (
                    <span className={classes.eventBody}>
                      <span className={classes.competitionTicketInline}>
                        {t('archer.competitions.ticket')}
                      </span>
                      {event.title}
                    </span>
                  );
                }
                return (
                  <span className={classes.eventBody}>
                    {Icon && (
                      <Icon
                        size={14}
                        style={{ flexShrink: 0 }}
                        className={pending ? classes.pendingIcon : undefined}
                      />
                    )}
                    {session?.plannedByCoach && pending && (
                      <span
                        className={classes.coachStampInline}
                        title={t('journal.plannedByCoach')}
                      >
                        {t('journal.coachStamp')}
                      </span>
                    )}
                    {event.title}
                  </span>
                );
              }}
              mobileMonthViewProps={{
                withOutsideDays: false,
                onSelectedDateChange: (day) => setPickedDay(day && dayjs(day).format('YYYY-MM-DD')),
                // "samedi 3 octobre" rather than the default English order "Saturday, October 3".
                eventsHeaderFormat: locale === 'fr' ? 'dddd D MMMM' : 'dddd, MMMM D',
                // Bigger session dots (Schedule does not forward its own classNames to the mobile view).
                classNames: {
                  mobileMonthViewHeader: classes.hiddenHeader,
                  mobileMonthViewWeekday: classes.weekday,
                  mobileMonthViewDay: classes.mobileDay,
                  mobileMonthViewDayIndicators: classes.dayIndicators,
                  mobileMonthViewDayIndicator: classes.dayIndicator,
                },
              }}
              labels={{
                day: t('schedule.day'),
                week: t('schedule.week'),
                month: t('schedule.month'),
                year: t('schedule.year'),
                allDay: t('schedule.allDay'),
                today: t('schedule.today'),
                next: t('schedule.next'),
                previous: t('schedule.previous'),
                noEvents: t('schedule.noEvents'),
                agenda: t('schedule.agenda'),
                more: t('schedule.more'),
                viewSelectLabel: t('schedule.viewSelectLabel'),
                moreLabel: (count) => t('schedule.moreLabel', { count }),
              }}
            />
          </div>
        </CalendarFrame>
        {!coach && (
          <MonthThemeModal
            journal={journal}
            month={month}
            opened={pickingTheme}
            onClose={() => setPickingTheme(false)}
            titleColor={titleColor}
            // Once the name is drawn (its font loaded).
            onTitleColorChange={lettering ? colorTitle : undefined}
            onStartColoring={isColoring ? undefined : () => setColoringOn(true)}
          />
        )}
        <NewSessionModal
          journal={journal}
          customTypes={customTypes}
          defaults={newSession}
          onClose={() => setNewSession(null)}
          coachOf={archerId}
        />
        <CompetitionsModal
          day={competitionDay}
          competitions={shownCompetitions}
          sessions={sessions}
          adding={competitionAdding}
          onClose={() => setCompetitionDay(null)}
          onAdded={() => setReloads((n) => n + 1)}
        />
      </Box>
    </div>
  );
}

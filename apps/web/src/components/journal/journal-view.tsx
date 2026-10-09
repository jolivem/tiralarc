'use client';

import { Button, Group, LoadingOverlay, Box } from '@mantine/core';
import { Schedule, type ScheduleEventData } from '@mantine/schedule';
import { IconBrush, IconPalette, IconPlus } from '@tabler/icons-react';
import type { Journal, JournalSessionSummary } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { listSessions } from '@/app/actions/journal';
import { useRouter } from '@/i18n/navigation';
import { CalendarFrame } from './calendar-frame';
import { ColoringToolbar, DEFAULT_COLOR } from './coloring-toolbar';
import { MonthThemeModal, monthTheme } from './month-theme-modal';
import { eventDisplay } from './event-display';
import classes from './journal.module.css';
import {
  clampToJournal,
  type NewSessionDefaults,
  NewSessionModal,
  today,
} from './new-session-modal';
import { SESSION_TYPES } from './session-types';
import { useMonthColoring } from './use-month-coloring';

const DEFAULT_DURATION_MINUTES = 60;

/** Days to load for the visible month (with a margin for the neighbouring weeks shown). */
function visibleRange(date: string): { from: string; to: string } {
  const d = dayjs(date);
  return {
    from: d.startOf('month').subtract(7, 'day').format('YYYY-MM-DD'),
    to: d.endOf('month').add(7, 'day').format('YYYY-MM-DD'),
  };
}

type EventPayload = { session: JournalSessionSummary };

/** Calendar entries: timed sessions on their slot, others as all-day events. */
function toEvent(session: JournalSessionSummary, title: string): ScheduleEventData<EventPayload> {
  const { color } = eventDisplay(session);
  if (!session.startTime) {
    return {
      id: session.id,
      title,
      start: `${session.date} 00:00:00`,
      end: dayjs(session.date).add(1, 'day').format('YYYY-MM-DD 00:00:00'),
      color,
      payload: { session },
    };
  }
  const start = dayjs(`${session.date}T${session.startTime}`);
  return {
    id: session.id,
    title,
    start: start.format('YYYY-MM-DD HH:mm:ss'),
    end: start
      .add(session.durationMinutes || DEFAULT_DURATION_MINUTES, 'minute')
      .format('YYYY-MM-DD HH:mm:ss'),
    color,
    payload: { session },
  };
}

/** One journal: "New event" button + month calendar + quick-add dialog. */
export function JournalView({ journal }: { journal: Journal }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  // A past or future season opens on its closest day rather than on an empty month.
  const [date, setDate] = useState(() => clampToJournal(today(), journal));
  const [sessions, setSessions] = useState<JournalSessionSummary[]>([]);
  const [loading, startLoading] = useTransition();
  const [newSession, setNewSession] = useState<NewSessionDefaults | null>(null);

  const [pickingTheme, setPickingTheme] = useState(false);
  /** Displayed month, "YYYY-MM": each month has its own decoration. */
  const month = date.slice(0, 7);

  const theme = monthTheme(journal, month);
  const coloring = useMonthColoring(journal, month, theme);
  const [coloringOn, setColoringOn] = useState(false);
  const [tool, setTool] = useState<string>(DEFAULT_COLOR);
  // Colouring needs a decoration: moving to a month without one leaves the mode.
  const isColoring = coloringOn && theme !== null;
  const coloringStatus =
    coloring.status === 'saving'
      ? t('journals.coloring.saving')
      : coloring.status === 'saved'
        ? t('journals.coloring.saved')
        : coloring.status === 'idle' || coloring.status === undefined
          ? ''
          : t(`errors.${coloring.status}`);

  const { from, to } = visibleRange(date);
  useEffect(() => {
    startLoading(async () => setSessions(await listSessions(journal.id, from, to)));
  }, [journal.id, from, to]);

  const events = sessions.map((session) => {
    // An "other" event is its title (or its text); a session is its type, with its score or place.
    const note =
      SESSION_TYPES[session.type].form === 'note' &&
      (session.title || session.description?.split('\n')[0]);
    const parts = [note || t(`journal.typesShort.${session.type}`)];
    if (session.score !== null) parts.push(String(session.score));
    else if (session.location) parts.push(session.location);
    return toEvent(session, parts.join(' · '));
  });

  return (
    <Box pos="relative" className={classes.calendarWidth}>
      <Group justify="flex-end" gap="sm" mb="sm">
        <Button
          variant="default"
          leftSection={<IconPalette size={18} />}
          onClick={() => setPickingTheme(true)}
        >
          {t('journals.theme')}
        </Button>
        {theme && !isColoring && (
          <Button
            variant="default"
            leftSection={<IconBrush size={18} />}
            onClick={() => setColoringOn(true)}
          >
            {t('journals.coloring.start')}
          </Button>
        )}
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => setNewSession({ date: today() })}
        >
          {t('journal.newSession')}
        </Button>
      </Group>
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
          <Schedule
            layout="responsive"
            date={date}
            onDateChange={setDate}
            // Month only: no day / week / year views, so no view selector either.
            view="month"
            monthViewProps={{ viewSelectProps: { display: 'none' } }}
            events={events}
            // Not mode="static": @mantine/schedule 9.6.3 then leaks `withEventResize` to the DOM.
            onEventClick={(event) => router.push(`/archer/journal/${event.id}`)}
            onDayClick={(day) => setNewSession({ date: dayjs(day).format('YYYY-MM-DD') })}
            renderEventBody={(event) => {
              const session = (event.payload as EventPayload | undefined)?.session;
              const Icon = session ? eventDisplay(session).icon : null;
              return (
                <span className={classes.eventBody}>
                  {Icon && <Icon size={14} style={{ flexShrink: 0 }} />}
                  {event.title}
                </span>
              );
            }}
            mobileMonthViewProps={{
              // "samedi 3 octobre" rather than the default English order "Saturday, October 3".
              eventsHeaderFormat: locale === 'fr' ? 'dddd D MMMM' : 'dddd, MMMM D',
              // Bigger session dots (Schedule does not forward its own classNames to the mobile view).
              classNames: {
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
      <MonthThemeModal
        journal={journal}
        month={month}
        opened={pickingTheme}
        onClose={() => setPickingTheme(false)}
      />
      <NewSessionModal
        journal={journal}
        defaults={newSession}
        onClose={() => setNewSession(null)}
      />
    </Box>
  );
}

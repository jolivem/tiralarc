'use client';

import { Button, Group, LoadingOverlay, Box } from '@mantine/core';
import { Schedule, type ScheduleEventData, type ScheduleViewLevel } from '@mantine/schedule';
import { IconPlus } from '@tabler/icons-react';
import type { JournalSessionSummary } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { listSessions } from '@/app/actions/journal';
import { useRouter } from '@/i18n/navigation';
import classes from './journal.module.css';
import { type NewSessionDefaults, NewSessionModal, today } from './new-session-modal';
import { SESSION_TYPES } from './session-types';

const DEFAULT_DURATION_MINUTES = 60;

/** Days to load for the visible period (with a margin for the neighbouring weeks shown). */
function visibleRange(date: string, view: ScheduleViewLevel): { from: string; to: string } {
  const d = dayjs(date);
  const unit = view === 'year' ? 'year' : view === 'month' ? 'month' : 'week';
  return {
    from: d.startOf(unit).subtract(7, 'day').format('YYYY-MM-DD'),
    to: d.endOf(unit).add(7, 'day').format('YYYY-MM-DD'),
  };
}

type EventPayload = { session: JournalSessionSummary };

/** Calendar entries: timed sessions on their slot, others as all-day events. */
function toEvent(session: JournalSessionSummary, title: string): ScheduleEventData<EventPayload> {
  const { color } = SESSION_TYPES[session.type];
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

/** Journal: "New session" button + calendar + quick-add dialog. */
export function JournalView() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [view, setView] = useState<ScheduleViewLevel>('month');
  const [sessions, setSessions] = useState<JournalSessionSummary[]>([]);
  const [loading, startLoading] = useTransition();
  const [newSession, setNewSession] = useState<NewSessionDefaults | null>(null);

  const { from, to } = visibleRange(date, view);
  useEffect(() => {
    startLoading(async () => setSessions(await listSessions(from, to)));
  }, [from, to]);

  const events = sessions.map((session) => {
    const parts = [t(`journal.typesShort.${session.type}`)];
    if (session.score !== null) parts.push(String(session.score));
    else if (session.location) parts.push(session.location);
    return toEvent(session, parts.join(' · '));
  });

  return (
    <Box pos="relative">
      <Group justify="flex-end" mb="sm">
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() =>
            setNewSession({ date: view === 'month' || view === 'year' ? today() : date })
          }
        >
          {t('journal.newSession')}
        </Button>
      </Group>
      <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} loaderProps={{ size: 'sm' }} />
      <Schedule
        layout="responsive"
        date={date}
        onDateChange={setDate}
        view={view}
        onViewChange={setView}
        events={events}
        // Not mode="static": @mantine/schedule 9.6.3 then leaks `withEventResize` to the DOM.
        onEventClick={(event) => router.push(`/archer/journal/${event.id}`)}
        onDayClick={(day) => setNewSession({ date: dayjs(day).format('YYYY-MM-DD') })}
        // Day / week only: in 9.6.3 the month and year views leak these handlers to the DOM.
        {...(view === 'day' || view === 'week'
          ? {
              onAllDaySlotClick: (day: string) =>
                setNewSession({ date: dayjs(day).format('YYYY-MM-DD') }),
              onTimeSlotClick: ({ slotStart }: { slotStart: string }) =>
                setNewSession({
                  date: dayjs(slotStart).format('YYYY-MM-DD'),
                  time: dayjs(slotStart).format('HH:mm'),
                }),
            }
          : {})}
        renderEventBody={(event) => {
          const session = (event.payload as EventPayload | undefined)?.session;
          const Icon = session ? SESSION_TYPES[session.type].icon : null;
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
      <NewSessionModal defaults={newSession} onClose={() => setNewSession(null)} />
    </Box>
  );
}

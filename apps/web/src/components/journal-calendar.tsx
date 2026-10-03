'use client';

import { Schedule, type ScheduleEventData } from '@mantine/schedule';
import { useLocale, useTranslations } from 'next-intl';

/**
 * Training journal calendar. `layout="responsive"` switches to Mantine's
 * mobile month view on small screens. Events will come from the API.
 */
export function JournalCalendar({ events = [] }: { events?: ScheduleEventData[] }) {
  const t = useTranslations('schedule');
  const locale = useLocale();
  return (
    <Schedule
      layout="responsive"
      // "samedi 3 octobre" rather than the default English order "Saturday, October 3".
      mobileMonthViewProps={{
        eventsHeaderFormat: locale === 'fr' ? 'dddd D MMMM' : 'dddd, MMMM D',
      }}
      defaultView="month"
      events={events}
      // Not mode="static": @mantine/schedule 9.6.3 then leaks `withEventResize={false}` from
      // MonthView / YearView to the DOM (React warning, Next.js dev overlay).
      labels={{
        day: t('day'),
        week: t('week'),
        month: t('month'),
        year: t('year'),
        allDay: t('allDay'),
        today: t('today'),
        next: t('next'),
        previous: t('previous'),
        noEvents: t('noEvents'),
        agenda: t('agenda'),
        more: t('more'),
        viewSelectLabel: t('viewSelectLabel'),
        moreLabel: (count) => t('moreLabel', { count }),
      }}
    />
  );
}

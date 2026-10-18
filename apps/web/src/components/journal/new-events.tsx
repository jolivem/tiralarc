import { Group } from '@mantine/core';
import type { NewEvent } from '@tiralarc/api-client';
import { getFormatter, getTranslations } from 'next-intl/server';
import { HandHeading } from '@/components/notebook/notebook';
import { RuledStack } from '@/components/notebook/ruled-stack';
import { Link } from '@/i18n/navigation';
import { EventIcon } from './event-display';
import classes from './journal.module.css';

/**
 * Home page: the events the archer's coach proposed (planned) that the archer hasn't opened
 * yet, each leading to the Journal on its month (opening its sheet takes it off the list).
 * Written on the notebook's lines: one event per line. Shown while the archer has a coach
 * able to propose events (`hasPlanningCoach`), or proposals left to read.
 */
export async function NewEvents({
  events,
  hasPlanningCoach,
}: {
  events: NewEvent[];
  hasPlanningCoach: boolean;
}) {
  if (events.length === 0 && !hasPlanningCoach) return null;
  const t = await getTranslations('journal');
  const format = await getFormatter();

  return (
    <section>
      <RuledStack>
        <Group gap="sm" align="center" wrap="nowrap">
          <HandHeading>{t('newEvents.title')}</HandHeading>
          <span className={classes.coachStampTitle}>{t('coachStamp')}</span>
        </Group>
        {events.length === 0 ? (
          <p className={classes.newEventsEmpty}>{t('newEvents.empty')}</p>
        ) : (
          <ul className={classes.newEvents}>
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  href={{ pathname: '/archer/journal', query: { month: event.date.slice(0, 7) } }}
                  className={classes.newEvent}
                >
                  <EventIcon session={event} size={22} />
                  <span className={classes.newEventText}>
                    {/* "25/10/26" (noon, so the calendar day is the same in every time zone). */}
                    {format.dateTime(new Date(`${event.date}T12:00:00`), {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                    {' · '}
                    {event.customType?.title ?? t(`types.${event.type}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </RuledStack>
    </section>
  );
}

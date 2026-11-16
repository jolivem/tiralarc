import { Group } from '@mantine/core';
import { IconMessageCircle } from '@tabler/icons-react';
import type { NewCommentEvent, NewEvent } from '@tiralarc/api-client';
import { getFormatter, getTranslations } from 'next-intl/server';
import { RuledHeading } from '@/components/notebook/on-ruling';
import { RuledStack } from '@/components/notebook/ruled-stack';
import { Link } from '@/i18n/navigation';
import { EventIcon } from './event-display';
import classes from './journal.module.css';

/**
 * Home page: the events the archer's coach proposed (planned) that the archer hasn't opened
 * yet, each leading to the Journal on its month, then the events their coach commented on
 * ("Nouveau commentaire"), each leading straight to its sheet; opening the sheet takes either
 * off the list. Written on the notebook's lines: one entry per line. Shown while the archer has
 * a coach able to propose events (`hasPlanningCoach`), or something left to read.
 */
export async function NewEvents({
  events,
  comments,
  hasPlanningCoach,
}: {
  events: NewEvent[];
  comments: NewCommentEvent[];
  hasPlanningCoach: boolean;
}) {
  if (events.length === 0 && comments.length === 0 && !hasPlanningCoach) return null;
  const t = await getTranslations('journal');
  const format = await getFormatter();
  // "25/10/26" (noon, so the calendar day is the same in every time zone).
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00`), {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

  return (
    <section>
      <RuledStack>
        <Group gap="sm" align="center" wrap="nowrap">
          <RuledHeading>{t('newEvents.title')}</RuledHeading>
          <span className={classes.coachStampTitle}>{t('coachStamp')}</span>
        </Group>
        {events.length === 0 && comments.length === 0 ? (
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
                    {day(event.date)}
                    {' · '}
                    {event.customType?.title ?? t(`types.${event.type}`)}
                  </span>
                </Link>
              </li>
            ))}
            {comments.map((event) => (
              <li key={`comment-${event.id}`}>
                <Link
                  href={`/archer/journal/${event.id}`}
                  className={classes.newEvent}
                  title={t('newEvents.commentBy', { name: event.coach.name })}
                >
                  <IconMessageCircle
                    size={22}
                    color="var(--mantine-color-blue-filled)"
                    aria-hidden
                    style={{ flexShrink: 0 }}
                  />
                  <span className={classes.newEventText}>
                    {t('newEvents.comment', { count: event.newComments })}
                    {' · '}
                    {day(event.date)}
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

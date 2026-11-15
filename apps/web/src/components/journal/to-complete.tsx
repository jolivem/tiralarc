import type { JournalSessionSummary } from '@tiralarc/api-client';
import { getFormatter, getTranslations } from 'next-intl/server';
import { RuledHeading } from '@/components/notebook/on-ruling';
import { RuledStack } from '@/components/notebook/ruled-stack';
import { Link } from '@/i18n/navigation';
import { EventIcon } from './event-display';
import classes from './journal.module.css';

/** Events listed; the others are counted, with a link to the Journal. */
const SHOWN = 3;

/**
 * Home page: the selected journal's past events whose review is still to write (`completed`
 * false: trainings, coachings, competitions without any review field), most recent first, each
 * leading to its sheet. Written on the notebook's lines, one event per line; nothing when none.
 * `sessions`: the journal's events up to yesterday.
 */
export async function ToComplete({ sessions }: { sessions: JournalSessionSummary[] }) {
  const pending = sessions
    .filter((s) => !s.completed)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (pending.length === 0) return null;
  const t = await getTranslations('journal');
  const format = await getFormatter();
  const others = pending.length - SHOWN;

  return (
    <section>
      <RuledStack>
        <RuledHeading>{t('pendingReviews.title')}</RuledHeading>
        <ul className={classes.newEvents}>
          {pending.slice(0, SHOWN).map((session) => (
            <li key={session.id}>
              <Link href={`/archer/journal/${session.id}`} className={classes.newEvent}>
                <EventIcon session={session} size={22} />
                <span className={classes.newEventText}>
                  {/* "25/10/26" (noon, so the calendar day is the same in every time zone). */}
                  {format.dateTime(new Date(`${session.date}T12:00:00`), {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                  {' · '}
                  {session.customType?.title ?? t(`types.${session.type}`)}
                  {session.location && ` · ${session.location}`}
                </span>
              </Link>
            </li>
          ))}
          {others > 0 && (
            <li>
              <Link href="/archer/journal" className={classes.newEvent}>
                <span className={classes.newEventText}>
                  {t('pendingReviews.others', { count: others })}
                </span>
              </Link>
            </li>
          )}
        </ul>
      </RuledStack>
    </section>
  );
}

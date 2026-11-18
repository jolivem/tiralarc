import type { JournalSessionSummary } from '@tiralarc/api-client';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { RuledHeading, RuledLine } from '@/components/notebook/on-ruling';
import { regularity, SESSIONS_PER_WEEK } from '@/lib/regularity';
import classes from './journal.module.css';

/**
 * Home page, right page, first under the day: the selected journal's regularity — events noted
 * against the days gone since the season began, and the weeks in a row with at least two
 * sessions (`lib/regularity.ts`). On the notebook's lines, one figure per line. `raised`: its
 * heading level with the left page's calendar.
 */
export async function RegularityCard({
  sessions,
  startDate,
  today,
  raised = false,
}: {
  /** The journal's events up to today. */
  sessions: JournalSessionSummary[];
  startDate: string;
  today: string;
  raised?: boolean;
}) {
  const t = await getTranslations('archer.regularity');
  const { events, days, streakWeeks } = regularity(sessions, startDate, today);
  const strong = (chunks: ReactNode) => <strong className={classes.figureInk}>{chunks}</strong>;

  return (
    // A blank ruled line under it, before the next card's heading.
    <section className={classes.regularity}>
      <RuledHeading raised={raised} highlight="mint">
        {t('title')}
      </RuledHeading>
      <RuledLine className={classes.regularityLine}>
        {t.rich('events', { events, days, strong })}
      </RuledLine>
      <RuledLine className={classes.regularityLine}>
        {streakWeeks > 0
          ? t.rich('streak', { weeks: streakWeeks, sessions: SESSIONS_PER_WEEK, strong })
          : t('noStreak', { sessions: SESSIONS_PER_WEEK })}
      </RuledLine>
    </section>
  );
}

'use client';

import { UnstyledButton } from '@mantine/core';
import { IconStar, IconStarFilled, IconStarHalfFilled } from '@tabler/icons-react';
import type { Journal, MonthStars } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { saveMonthSatisfaction } from '@/app/actions/journal';
import classes from './journal.module.css';
import { clickStar, STAR_COUNT, starFill } from './month-stars';

const SAVE_DELAY_MS = 600;
const STAR_ICONS = { empty: IconStar, half: IconStarHalfFilled, full: IconStarFilled };

/**
 * The displayed month's satisfaction: what the server has, plus the archer's clicks, saved a
 * moment after the last one (and when leaving).
 */
function useMonthSatisfaction(journal: Journal, month: string) {
  // Clicks since the page loaded, by month: moving to another month and back keeps them.
  const [edits, setEdits] = useState<Record<string, MonthStars | null>>({});
  const pending = useRef<{ month: string; stars: MonthStars | null; timer: number } | null>(null);

  const saved = journal.monthSatisfactions.find((m) => m.month === month)?.stars ?? null;
  const stars = month in edits ? edits[month]! : saved;

  const flush = useCallback(() => {
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    window.clearTimeout(job.timer);
    void saveMonthSatisfaction(journal.id, job.month, job.stars);
  }, [journal.id]);

  // Leaving the page: don't lose the last click.
  useEffect(() => flush, [flush]);

  const change = (next: MonthStars | null) => {
    // Another month's save is still waiting: send it before queuing this one.
    if (pending.current && pending.current.month !== month) flush();
    if (pending.current) window.clearTimeout(pending.current.timer);
    setEdits((all) => ({ ...all, [month]: next }));
    pending.current = { month, stars: next, timer: window.setTimeout(flush, SAVE_DELAY_MS) };
  };

  return { stars, change };
}

/**
 * The displayed month at a glance, centred at the top of the page: the arrows shot in it and the
 * archer's overall satisfaction (5 stars, by halves). Read-only for a coach.
 */
export function MonthSummary({
  journal,
  month,
  arrows,
  readOnly,
}: {
  journal: Journal;
  /** "YYYY-MM". */
  month: string;
  arrows: number;
  readOnly?: boolean;
}) {
  const t = useTranslations('journal.monthSummary');
  const format = useFormatter();
  const { stars, change } = useMonthSatisfaction(journal, month);
  const rating = t('rating', { stars: stars ?? 0 });

  return (
    <section className={classes.monthSummary} aria-label={t('label')}>
      <QuiverDrawing />
      <div className={classes.summarySection}>
        <h3 className={classes.summaryTitle}>{t('arrows')}</h3>
        <div className={classes.arrowBox}>
          <span aria-label={t('arrowsValue', { count: arrows })}>{format.number(arrows)}</span>
          <ArrowDrawing />
        </div>
      </div>
      <div className={classes.summaryDivider} aria-hidden />
      <div className={classes.summarySection}>
        <h3 className={classes.summaryTitle}>{t('satisfaction')}</h3>
        <div className={classes.stars} role="group" aria-label={`${t('satisfaction')} : ${rating}`}>
          {Array.from({ length: STAR_COUNT }, (_, i) => {
            const n = i + 1;
            const Icon = STAR_ICONS[starFill(stars, n)];
            const icon = <Icon size={30} className={classes.star} />;
            return readOnly ? (
              <span key={n} aria-hidden>
                {icon}
              </span>
            ) : (
              <UnstyledButton
                key={n}
                className={classes.starButton}
                aria-label={t('star', { n })}
                onClick={() => change(clickStar(stars, n))}
              >
                {icon}
              </UnstyledButton>
            );
          })}
        </div>
      </div>
      <TargetDrawing />
    </section>
  );
}

/*
 * The frame's drawings: black line art on transparent (`public/month-summary/`) used as masks,
 * so they take the text colour (light and dark themes alike).
 */

/**
 * A quiver holding three arrows: `public/month-summary/quiver.png` (black strokes on
 * transparent) as a mask, so it takes the text colour.
 */
function QuiverDrawing() {
  return <div className={`${classes.summaryDrawing} ${classes.quiverDrawing}`} aria-hidden />;
}

/** An arrow in the corner of the arrows' box: `public/month-summary/arrow.png`, as a mask. */
function ArrowDrawing() {
  return <div className={classes.arrowBoxDrawing} aria-hidden />;
}

/** A target on its easel, just hit: `public/month-summary/target.png`, as a mask. */
function TargetDrawing() {
  return <div className={`${classes.summaryDrawing} ${classes.targetDrawing}`} aria-hidden />;
}

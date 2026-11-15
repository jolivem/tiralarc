import { Rating } from '@mantine/core';
import type { PublicReview } from '@tiralarc/api-client';
import { getFormatter, getTranslations } from 'next-intl/server';
import classes from './reviews.module.css';

/**
 * Visitors' home page, under the FAQ: what users think of the app (published reviews, the
 * latest first), as notes in a row that scrolls sideways. Nothing while there is none.
 */
export async function ReviewsStrip({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) return null;
  const t = await getTranslations('reviews');
  const format = await getFormatter();
  const average = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;

  return (
    <section className={classes.strip} aria-label={t('publicTitle')}>
      <header className={classes.stripHeader}>
        <h2 className={classes.stripTitle}>{t('publicTitle')}</h2>
        <span className={classes.average}>
          <Rating value={Math.round(average * 2) / 2} fractions={2} readOnly size="sm" />
          {t('average', {
            average: format.number(average, { maximumFractionDigits: 1 }),
            count: reviews.length,
          })}
        </span>
      </header>
      {/* Sideways: the row scrolls (trackpad, shift + wheel, swipe, or its scrollbar). */}
      <ul className={classes.row} tabIndex={0} aria-label={t('rowLabel')}>
        {reviews.map((review, i) => (
          <li key={review.id} className={classes.note} data-tint={i % 4}>
            <Rating value={review.stars} readOnly size="sm" />
            <p className={classes.comment}>« {review.comment} »</p>
            <p className={classes.author}>
              {review.authorName} ·{' '}
              {format.dateTime(new Date(`${review.date}T12:00:00Z`), {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

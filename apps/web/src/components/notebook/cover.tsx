import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { ARCHER_SECTIONS, tabColors } from '@/components/sections';
import classes from './cover.module.css';

/**
 * The closed notebook on the desk: leather cover with the site's name, tagline and bow in
 * relief, divider tabs and ribbon; `children` go on the raised panel at the bottom
 * (`wide` when they are a form).
 */
export async function NotebookCover({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const t = await getTranslations('home');

  return (
    <div className={wide ? `${classes.cover} ${classes.wide}` : classes.cover}>
      <span className={classes.ribbon} aria-hidden />
      <span className={classes.dividers} aria-hidden>
        {ARCHER_SECTIONS.map((section) => (
          // Each in the pastel shade of its section's colour.
          <span
            key={section.key}
            className={classes.divider}
            style={tabColors({ ...section, pastel: true })}
          />
        ))}
      </span>
      <h1 className={`${classes.coverTitle} ${classes.emboss}`}>MyArcheryDiary</h1>
      <p className={`${classes.coverTagline} ${classes.emboss}`}>{t('tagline')}</p>
      <span className={classes.coverArt} aria-hidden>
        <span className={classes.coverArtStrokes} />
      </span>
      <div className={classes.label}>{children}</div>
    </div>
  );
}

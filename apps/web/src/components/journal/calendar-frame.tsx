import type { ReactNode } from 'react';
import classes from './journal.module.css';
import { findTheme, type ThemeBand, themeImage, THEMES } from './themes';

/**
 * Surrounds the calendar with its journal's decoration theme: a band on each
 * side on large screens, top and bottom on tablets, top only on phones.
 */
export function CalendarFrame({ theme, children }: { theme: string | null; children: ReactNode }) {
  const id = findTheme(theme);
  if (!id) return <>{children}</>;

  const bands: readonly ThemeBand[] = THEMES[id].bands;
  const band = (name: ThemeBand) =>
    bands.includes(name) && (
      // Decorative, and static files of unknown size: a plain <img> rather than next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={themeImage(id, name)} alt="" className={classes.frameBand} data-band={name} />
    );

  return (
    <div className={classes.frame}>
      {band('top')}
      {band('left')}
      <div className={classes.frameContent}>{children}</div>
      {band('right')}
      {band('bottom')}
    </div>
  );
}

import type { ReactNode } from 'react';
import classes from './notebook.module.css';

/**
 * An open notebook: a cover holding two ruled pages, side by side from desktops up
 * (md), one above the other on smaller screens.
 */
export function Notebook({
  left,
  right,
  label,
}: {
  left: ReactNode;
  right: ReactNode;
  /** Accessible name of the whole spread. */
  label?: string;
}) {
  return (
    <div className={classes.notebook} role="group" aria-label={label}>
      <section className={classes.page} data-side="left">
        {left}
      </section>
      <section className={classes.page} data-side="right">
        {right}
      </section>
    </div>
  );
}

/** A handwritten heading, on a notebook page or around the notebook. */
export function HandHeading({ order = 2, children }: { order?: 1 | 2 | 3; children: ReactNode }) {
  const Tag = `h${order}` as const;
  return (
    <Tag className={classes.hand} data-order={order}>
      {children}
    </Tag>
  );
}

/** A small handwritten note in ink, e.g. the date at the top of a page. */
export function HandNote({
  align = 'start',
  children,
}: {
  align?: 'start' | 'end';
  children: ReactNode;
}) {
  return (
    <p className={classes.handNote} style={{ textAlign: align }}>
      {children}
    </p>
  );
}

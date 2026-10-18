import type { ReactNode } from 'react';
import classes from './notebook.module.css';

/**
 * What a notebook shows: two pages (`left` and `right`), or one wide page (`children`)
 * for content the fold would cut, such as a calendar or charts.
 */
export type NotebookPages =
  | { left: ReactNode; right: ReactNode; children?: never }
  | { children: ReactNode; left?: never; right?: never };

/**
 * An open notebook: a cover holding two ruled pages, side by side from desktops up
 * (md), one above the other on smaller screens — or a single wide page.
 */
export function Notebook({
  label,
  plain = false,
  squared = false,
  dotted = false,
  className,
  ...pages
}: NotebookPages & {
  /** Accessible name of the whole spread. */
  label?: string;
  /** Unruled paper (the margin line stays), e.g. under a calendar. */
  plain?: boolean;
  /** Squared paper ("petits carreaux", no margin line), e.g. under charts. */
  squared?: boolean;
  /** Dotted paper, like a bullet journal (the margin line stays), e.g. the Profile page. */
  dotted?: boolean;
  /** Extra class on the cover, e.g. the home page's fonts. */
  className?: string;
}) {
  return (
    <div
      className={className ? `${classes.notebook} ${className}` : classes.notebook}
      role="group"
      aria-label={label}
      data-plain={plain || undefined}
      data-squared={squared || undefined}
      data-dotted={dotted || undefined}
    >
      {pages.right === undefined ? (
        <section className={classes.page} data-leaf>
          {pages.children}
        </section>
      ) : (
        <>
          {/* `data-leaf`: a RuledStack in a page keeps its blocks on the page's lines. */}
          <section className={classes.page} data-side="left" data-leaf>
            {pages.left}
          </section>
          <section className={classes.page} data-side="right" data-leaf>
            {pages.right}
          </section>
        </>
      )}
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

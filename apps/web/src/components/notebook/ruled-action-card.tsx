import type { ReactNode } from 'react';
import { type Highlighter, RuledHeading } from './on-ruling';
import { RuledStack } from './ruled-stack';
import classes from './ruled-action-card.module.css';

/**
 * A card written on the home notebook's lines: its title, what it is for, and on its right a
 * button (the PDF extract, the competition planning).
 */
export function RuledActionCard({
  title,
  intro,
  action,
  raised = false,
  highlight,
  children,
}: {
  /** Its heading a line higher (over the last line of what comes before). */
  raised?: boolean;
  /** Its heading's highlighter. */
  highlight: Highlighter;
  title: ReactNode;
  intro: ReactNode;
  action: ReactNode;
  /** Off the ruling, e.g. the dialog the button opens. */
  children?: ReactNode;
}) {
  return (
    <section>
      <RuledStack>
        <RuledHeading raised={raised} highlight={highlight}>
          {title}
        </RuledHeading>
        <div className={classes.row}>
          <p className={classes.intro}>{intro}</p>
          <div className={classes.action}>{action}</div>
        </div>
      </RuledStack>
      {children}
    </section>
  );
}

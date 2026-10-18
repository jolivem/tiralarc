import type { ReactNode } from 'react';
import classes from './loose-leaf.module.css';

/**
 * A loose-leaf sheet: white paper ruled in blue, a red margin line and punched holes on
 * the left. Its content sits right of the margin (e.g. an event's sheet); `RuledStack`
 * keeps blocks on its lines (`--step` apart, the first one a step below the top edge).
 * `margin` is written in the margin, near the top (e.g. the coach's stamp).
 */
export function LooseLeaf({ margin, children }: { margin?: ReactNode; children: ReactNode }) {
  return (
    <article className={classes.leaf} data-leaf>
      {margin && <div className={classes.margin}>{margin}</div>}
      {children}
    </article>
  );
}

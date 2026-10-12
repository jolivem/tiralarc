'use client';

import { type ReactNode, useLayoutEffect, useRef } from 'react';
import classes from './loose-leaf.module.css';

/**
 * A column of blocks on a loose leaf (loose-leaf.tsx) whose tops all fall on the sheet's
 * ruling: each block is pushed down to the next ruled line, so a heading at its top sits
 * on a line. Recomputed whenever the column's size changes (text typed, photos added…).
 */
export function RuledStack({
  leadingLines = 0,
  children,
}: {
  /** Empty ruled lines left above the first block. */
  leadingLines?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const column = ref.current;
    const leaf = column?.closest<HTMLElement>('[data-leaf]');
    if (!column || !leaf) return;
    const snap = () => {
      const step = parseFloat(getComputedStyle(leaf).getPropertyValue('--step'));
      if (!step) return;
      const blocks = [...column.children] as HTMLElement[];
      for (const block of blocks) block.style.marginTop = '';
      // In order: pushing a block down moves the next ones, so measure each after the last push.
      for (const block of blocks) {
        const top = block.getBoundingClientRect().top - leaf.getBoundingClientRect().top;
        const push = Math.ceil(top / step - 0.01) * step - top;
        if (push > 0.5) block.style.marginTop = `${push}px`;
      }
    };
    snap();
    // Pushes change the column's height, but the same layout gives the same pushes: it settles.
    const observer = new ResizeObserver(snap);
    observer.observe(column);
    for (const block of column.children) observer.observe(block);
    return () => observer.disconnect();
  });

  return (
    <div
      ref={ref}
      className={classes.ruledStack}
      style={{ paddingTop: `calc(var(--step) * ${leadingLines})` }}
    >
      {children}
    </div>
  );
}

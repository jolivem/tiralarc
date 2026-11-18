'use client';

import type { ComponentProps } from 'react';
import { SeasonBoard } from '@/components/stats/season-board';
import { Landscape } from './print-parts';
import classes from './print.module.css';

/**
 * The extract's last page: the season summary of its days, on the same whiteboard as the
 * Indicators page's "Bilan de saison" (season-board.tsx), landscape (turned left), scaled to
 * the page.
 */
export function PrintSeason(props: ComponentProps<typeof SeasonBoard>) {
  return (
    <Landscape>
      <div className={classes.season}>
        <SeasonBoard {...props} />
      </div>
    </Landscape>
  );
}

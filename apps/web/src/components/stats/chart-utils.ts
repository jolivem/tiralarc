import type { Discipline } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { DISCIPLINE_ORDER } from '@/components/journal/session-types';

/**
 * "All time" in the page's `period` search parameter; any other value is a journal id.
 * Lives here, not in the selector: a server component can't read a constant exported
 * by a client module.
 */
export const ALL_TIME = 'all';

/** Noon, so a calendar day lands on the same date in every time zone. */
export const toTime = (day: string) => dayjs(`${day}T12:00:00`).valueOf();

/** A discipline's colour: its slot in the fixed display order, never its rank on the chart. */
export const disciplineColor = (discipline: Discipline) =>
  `var(--series-${DISCIPLINE_ORDER.indexOf(discipline) + 1})`;

/** What a chart's time axis spans: a journal's period, or the archer's first to last event. */
export interface Period {
  startDate: string;
  endDate: string;
}

/**
 * Axis ticks: the first day of months within the period — every month for a
 * season, every second or third one over several years, so labels never crowd.
 */
export function monthTicks(start: string, end: string): number[] {
  const ticks: number[] = [];
  let month = dayjs(start).startOf('month');
  if (month.isBefore(dayjs(start))) month = month.add(1, 'month');
  const step = Math.max(1, Math.ceil((dayjs(end).diff(month, 'month') + 1) / 12));
  // Start on a multiple of the step, so January is always labelled.
  while (month.month() % step !== 0) month = month.add(1, 'month');
  for (; !month.isAfter(dayjs(end)); month = month.add(step, 'month')) ticks.push(month.valueOf());
  return ticks;
}

/** Shared look of the charts: solid hairline grid, quiet axes. */
export const CHART_CHROME = {
  h: 280,
  // Horizontal lines only (Mantine names the axis the lines start from).
  gridAxis: 'x',
  strokeDasharray: '0',
  gridColor: 'var(--viz-grid)',
  textColor: 'var(--viz-axis)',
  tickLine: 'none',
  strokeWidth: 2,
} as const;

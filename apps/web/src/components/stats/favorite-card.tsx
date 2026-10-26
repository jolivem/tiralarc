'use client';

import type { Indicator, JournalStats } from '@tiralarc/api-client';
import type { Period } from './chart-utils';
import {
  ArrowsCard,
  CompetitionsCard,
  DurationsCard,
  EventsCard,
  FeelingsCard,
  ScoresCard,
} from './stats-cards';
import classes from './stats.module.css';

/**
 * The card of one indicator, as on the Indicators page (the home page's favourite);
 * `compact`: smaller (3/4 wide, half height), in slightly smaller text, without its frame.
 */
export function IndicatorCard({
  compact = false,
  ...props
}: {
  indicator: Indicator;
  stats: JournalStats;
  period: Period;
  today: string;
  compact?: boolean;
}) {
  return compact ? (
    <div className={classes.compact}>
      <Card {...props} />
    </div>
  ) : (
    <Card {...props} />
  );
}

function Card({
  indicator,
  stats,
  period,
  today,
}: {
  indicator: Indicator;
  stats: JournalStats;
  period: Period;
  today: string;
}) {
  switch (indicator) {
    case 'ARROWS':
      return <ArrowsCard period={period} arrowsByDay={stats.arrowsByDay} today={today} />;
    case 'DURATIONS':
      return <DurationsCard period={period} durationsByDay={stats.durationsByDay} today={today} />;
    case 'SCORES':
      return <ScoresCard period={period} scores={stats.scores} today={today} />;
    case 'EVENTS':
      return <EventsCard period={period} eventsByDay={stats.eventsByDay} today={today} />;
    case 'COMPETITIONS':
      return <CompetitionsCard competitions={stats.competitions} />;
    case 'PHYSICAL_FEELINGS':
      return (
        <FeelingsCard
          kind="physical"
          period={period}
          feelingsByDay={stats.physicalFeelingsByDay}
          today={today}
        />
      );
    case 'MENTAL_FEELINGS':
      return (
        <FeelingsCard
          kind="mental"
          period={period}
          feelingsByDay={stats.mentalFeelingsByDay}
          today={today}
        />
      );
  }
}

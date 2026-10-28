'use client';

import { Badge } from '@mantine/core';
import type { Discipline, Indicator, JournalStats, RankingList } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { Fragment } from 'react';
import { DISCIPLINE_COLORS } from '@/components/journal/session-types';
import {
  ArrowsCard,
  CompetitionsCard,
  DurationsCard,
  EventsCard,
  FeelingsCard,
  PrintedCards,
  ScoresCard,
} from '@/components/stats/stats-cards';
import classes from './print.module.css';

/**
 * The archer's FFTA national rankings, this season and the one before (as on the home page),
 * in the chosen disciplines only.
 */
export function PrintRankings({
  list,
  disciplines,
}: {
  list: RankingList | null;
  disciplines: Discipline[];
}) {
  const t = useTranslations('archer.rankings');
  const tJournal = useTranslations('journal');
  const format = useFormatter();

  const body = () => {
    if (!list) return <p className={classes.muted}>{t('unavailable')}</p>;
    if (list.missing.length > 0) {
      return (
        <p className={classes.muted}>
          {t('missing', { fields: list.missing.map((field) => t(`fields.${field}`)).join(', ') })}
        </p>
      );
    }
    const current = list.season ?? '';
    const seasons = [current, String(Number(current) - 1)].flatMap((season) => {
      const rankings = list.rankings.filter(
        (r) => r.season === season && disciplines.includes(r.discipline),
      );
      return season === current || rankings.length > 0 ? [{ season, rankings }] : [];
    });
    return seasons.map(({ season, rankings }) => (
      <section key={season}>
        <h3 className={classes.subheading}>{t('season', { season })}</h3>
        {rankings.length === 0 && (
          <p className={classes.muted}>{list.complete ? t('none') : t('unavailable')}</p>
        )}
        {rankings.map((r) => (
          <div key={r.url} className={classes.ranking}>
            <Badge variant="light" color={DISCIPLINE_COLORS[r.discipline]}>
              {tJournal(`disciplines.${r.discipline}`)}
            </Badge>
            <strong style={{ fontSize: '12pt' }}>
              {t('place', { rank: r.rank, total: r.total })}
            </strong>
            <div className={`${classes.rankingDetails} ${classes.muted}`}>
              {[r.name, r.distance].filter(Boolean).join(' · ')}
            </div>
            <div className={classes.rankingDetails}>
              {[
                r.average !== null && t('average', { average: format.number(r.average) }),
                r.scores.length > 0 &&
                  t('scores', { scores: r.scores.map((s) => format.number(s)).join(' · ') }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        ))}
      </section>
    ));
  };

  return (
    <section className={classes.page}>
      <h2 className={classes.heading}>{t('title')}</h2>
      {body()}
    </section>
  );
}

/**
 * The chosen cards of the Indicators page over the extract's days, as printed
 * (`PrintedCards`): the whole span, no choices. The goals are not part of it.
 */
export function PrintStats({
  stats,
  indicators,
  from,
  to,
  today,
}: {
  stats: JournalStats | null;
  /** In the Indicators page's order. */
  indicators: Indicator[];
  from: string;
  to: string;
  today: string;
}) {
  const t = useTranslations();
  const period = { startDate: from, endDate: to };
  const card = (indicator: Indicator, stats: JournalStats) => {
    switch (indicator) {
      case 'ARROWS':
        return <ArrowsCard period={period} arrowsByDay={stats.arrowsByDay} today={today} />;
      case 'DURATIONS':
        return (
          <DurationsCard period={period} durationsByDay={stats.durationsByDay} today={today} />
        );
      case 'SCORES':
        return <ScoresCard period={period} scores={stats.scores} today={today} />;
      case 'EVENTS':
        return <EventsCard period={period} eventsByDay={stats.eventsByDay} today={today} />;
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
      case 'COMPETITIONS':
        return <CompetitionsCard competitions={stats.competitions} />;
    }
  };
  return (
    // No heading: the chapter's title page already says "Indicators".
    <section className={classes.page}>
      {stats ? (
        <PrintedCards value>
          <div className={classes.indicators}>
            {indicators.map((indicator) => (
              <Fragment key={indicator}>{card(indicator, stats)}</Fragment>
            ))}
          </div>
        </PrintedCards>
      ) : (
        <p className={classes.muted}>{t('export.unavailable')}</p>
      )}
    </section>
  );
}

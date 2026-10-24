'use client';

import { Anchor, Badge, Group, Loader, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import type { Ranking, RankingList } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { listRankings } from '@/app/actions/rankings';
import { DISCIPLINE_COLORS } from '@/components/journal/session-types';
import { AnchorLink } from '@/components/links';
import { RuledHeading, RuledSubtitle } from '@/components/notebook/on-ruling';
import classes from './stats.module.css';

/**
 * The archer's places in the FFTA national rankings of their category and bow, one per
 * discipline (outdoor: per distance), this season and the one before, on the right page of
 * the home notebook. Loaded once shown: the FFTA website can be slow.
 */
export function RankingsCard() {
  const t = useTranslations('archer.rankings');
  const tJournal = useTranslations('journal');
  const format = useFormatter();
  /** Undefined while loading; null when the API could not be reached. */
  const [list, setList] = useState<RankingList | null | undefined>();
  useEffect(() => {
    let current = true;
    listRankings().then((loaded) => {
      if (current) setList(loaded);
    });
    return () => {
      current = false;
    };
  }, []);

  const body = () => {
    if (list === undefined) return <Loader size="sm" aria-label={t('loading')} />;
    if (list === null) {
      return (
        <Text size="sm" c="dimmed">
          {t('unavailable')}
        </Text>
      );
    }
    if (list.missing.length > 0) {
      return (
        <Text size="sm" c="dimmed">
          {t('missing', {
            fields: list.missing.map((field) => t(`fields.${field}`)).join(', '),
          })}{' '}
          <AnchorLink href="/archer/profile" size="sm">
            {t('setUp')}
          </AnchorLink>
        </Text>
      );
    }
    // This season (said so when the archer is not ranked yet), then the one before if ranked.
    const current = list.season ?? '';
    const seasons = [current, String(Number(current) - 1)].flatMap((season) => {
      const rankings = list.rankings.filter((r) => r.season === season);
      return season === current || rankings.length > 0 ? [{ season, rankings }] : [];
    });
    return (
      // No gap between the seasons: the one before starts on the next free line.
      <Stack gap={0}>
        {seasons.map(({ season, rankings }) => (
          <Stack key={season} gap="xs">
            {/* On a line: this season's right under the heading. */}
            <RuledSubtitle>{t('season', { season })}</RuledSubtitle>
            {rankings.length === 0 && (
              <Text size="sm" c="dimmed">
                {list.complete ? t('none') : t('unavailable')}
              </Text>
            )}
            {rankings.map(row)}
          </Stack>
        ))}
        {list.rankings.length > 0 && !list.complete && (
          <Text size="xs" c="orange">
            {t('incomplete')}
          </Text>
        )}
      </Stack>
    );
  };

  /** One ranking: discipline, place, name (and distance), average, scores, link. */
  const row = (r: Ranking) => (
    <div key={r.url} className={classes.ranking}>
      <Badge
        variant="light"
        color={DISCIPLINE_COLORS[r.discipline]}
        className={classes.rankingDiscipline}
      >
        {tJournal(`disciplines.${r.discipline}`)}
      </Badge>
      <Text fw={700} size="lg">
        {t('place', { rank: r.rank, total: r.total })}
      </Text>
      <Text size="xs" c="dimmed" className={classes.rankingName}>
        {[r.name, r.distance].filter(Boolean).join(' · ')}
      </Text>
      <Group gap="xs" className={classes.rankingScores}>
        {r.average !== null && (
          <Text size="sm">{t('average', { average: format.number(r.average) })}</Text>
        )}
        {r.scores.length > 0 && (
          <Text size="sm" c="dimmed">
            {t('scores', { scores: r.scores.map((s) => format.number(s)).join(' · ') })}
          </Text>
        )}
        <Anchor href={r.url} target="_blank" rel="noopener noreferrer" size="xs">
          {t('open')} <IconExternalLink size={12} style={{ verticalAlign: -1 }} />
        </Anchor>
      </Group>
    </div>
  );

  return (
    <section>
      {/* A line higher, level with the calendar's heading on the left page. */}
      <RuledHeading raised>{t('title')}</RuledHeading>
      {body()}
    </section>
  );
}

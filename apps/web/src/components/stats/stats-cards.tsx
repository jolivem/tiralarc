'use client';

import { AreaChart, ChartTooltip, LineChart } from '@mantine/charts';
import { Card, Group, Stack, Table, Text, Title } from '@mantine/core';
import type { CompetitionStat, Discipline, JournalStats } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AnchorLink } from '@/components/links';
import { DISCIPLINE_ORDER } from '@/components/journal/session-types';
import { CHART_CHROME, disciplineColor, monthTicks, type Period, toTime } from './chart-utils';
import classes from './stats.module.css';

/** Two competitions of a discipline further apart than this are not joined by a line. */
const MAX_GAP_MS = 60 * 86_400_000;
const SCORE_STEP = 50;

function StatsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card withBorder radius="lg" padding="lg" className={classes.viz}>
      <Stack gap="md">
        <Title order={2} size="h5" tt="uppercase" c="dimmed" lts={0.5}>
          {title}
        </Title>
        {children}
      </Stack>
    </Card>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <Text size="sm" c="dimmed">
    {children}
  </Text>
);

/** Date formatters shared by the cards (axis months, full days). */
function useDates() {
  const format = useFormatter();
  return {
    day: (time: number | string) =>
      format.dateTime(new Date(typeof time === 'string' ? toTime(time) : time), {
        dateStyle: 'medium',
      }),
    /** Axis label of a month: the year is spelled out each January. */
    month: (time: number) =>
      format.dateTime(
        new Date(time),
        new Date(time).getMonth() === 0 ? { month: 'short', year: '2-digit' } : { month: 'short' },
      ),
    number: (value: number) => format.number(value),
  };
}

/** The period's competitions, most recent first; each one opens its sheet. */
export function CompetitionsCard({ competitions }: { competitions: CompetitionStat[] }) {
  const t = useTranslations();
  const { day, number } = useDates();
  const rows = [...competitions].reverse();

  return (
    <StatsCard title={t('stats.competitions')}>
      {rows.length === 0 ? (
        <Empty>{t('stats.noCompetitions')}</Empty>
      ) : (
        <Table.ScrollContainer minWidth={0} mah={420} type="native">
          <Table verticalSpacing="xs" stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('stats.date')}</Table.Th>
                <Table.Th>{t('journal.discipline')}</Table.Th>
                <Table.Th ta="right">{t('stats.arrows')}</Table.Th>
                <Table.Th ta="right">{t('journal.score')}</Table.Th>
                <Table.Th visibleFrom="sm">{t('journal.location')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((c) => (
                <Table.Tr key={c.id}>
                  <Table.Td>
                    <AnchorLink href={`/archer/journal/${c.id}`} size="sm">
                      {day(c.date)}
                    </AnchorLink>
                  </Table.Td>
                  <Table.Td>
                    {c.discipline ? (
                      <>
                        <span
                          className={classes.swatch}
                          style={{ background: disciplineColor(c.discipline) }}
                        />
                        {t(`journal.disciplines.${c.discipline}`)}
                      </>
                    ) : (
                      '—'
                    )}
                  </Table.Td>
                  <Table.Td ta="right" className={classes.numeric}>
                    {c.arrowCount ?? '—'}
                  </Table.Td>
                  <Table.Td ta="right" fw={600} className={classes.numeric}>
                    {c.score === null ? '—' : number(c.score)}
                  </Table.Td>
                  <Table.Td visibleFrom="sm" c="dimmed">
                    {c.location ?? ''}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </StatsCard>
  );
}

/** Running total of arrows over the season, all types of events together. */
export function ArrowsCard({
  period,
  arrowsByDay,
  today,
}: {
  /** What the time axis spans. */
  period: Period;
  arrowsByDay: JournalStats['arrowsByDay'];
  today: string;
}) {
  const t = useTranslations('stats');
  const { day, month, number } = useDates();

  // Running total, starting from zero on the first day of the period.
  const data = [{ time: toTime(period.startDate), arrows: 0 }];
  for (const { date, arrows } of arrowsByDay) {
    data.push({ time: toTime(date), arrows: (data.at(-1)?.arrows ?? 0) + arrows });
  }
  const total = data.at(-1)?.arrows ?? 0;

  return (
    <StatsCard title={t('cumulativeArrows')}>
      {arrowsByDay.length === 0 ? (
        <Empty>{t('noArrows')}</Empty>
      ) : (
        <>
          <div>
            <Text className={classes.figure}>{number(total)}</Text>
            <Text size="sm" c="dimmed">
              {t('arrowsTotal')}
            </Text>
          </div>
          <AreaChart
            {...CHART_CHROME}
            data={data}
            dataKey="time"
            series={[{ name: 'arrows', label: t('arrows'), color: 'var(--series-1)' }]}
            curveType="linear"
            withGradient={false}
            fillOpacity={0.1}
            withDots={false}
            activeDotProps={{ r: 4, strokeWidth: 2, stroke: 'var(--mantine-color-body)' }}
            valueFormatter={number}
            xAxisProps={{
              type: 'number',
              scale: 'time',
              domain: [toTime(period.startDate), toTime(period.endDate)],
              ticks: monthTicks(period.startDate, period.endDate),
              tickFormatter: month,
            }}
            referenceLines={referenceToday(period, today, t('today'))}
            tooltipProps={{
              content: ({ label, payload }) => (
                <ChartTooltip
                  label={label === undefined ? undefined : day(Number(label))}
                  payload={payload}
                  series={[{ name: 'arrows', label: t('arrows'), color: 'var(--series-1)' }]}
                  valueFormatter={number}
                />
              ),
            }}
          />
        </>
      )}
    </StatsCard>
  );
}

/** Competition scores over the season, one line per discipline practised. */
export function ScoresCard({
  period,
  competitions,
  today,
}: {
  /** What the time axis spans. */
  period: Period;
  competitions: CompetitionStat[];
  today: string;
}) {
  const t = useTranslations();
  const { day, month, number } = useDates();

  const scored = competitions.filter(
    (c): c is CompetitionStat & { discipline: Discipline; score: number } =>
      c.discipline !== null && c.score !== null,
  );
  const disciplines = DISCIPLINE_ORDER.filter((d) => scored.some((c) => c.discipline === d));
  // A discipline is drawn as one line per stretch of competitions: after a long break (the
  // indoor season, for an outdoor discipline) a new line starts instead of bridging the gap.
  const rows = new Map<number, Record<string, number>>();
  const series: { name: string; label: string; color: string }[] = [];
  for (const discipline of disciplines) {
    let stretch = 0;
    let previous: number | null = null;
    for (const c of scored.filter((c) => c.discipline === discipline)) {
      const time = toTime(c.date);
      if (previous === null || time - previous > MAX_GAP_MS) {
        stretch += 1;
        series.push({
          name: `${discipline}:${stretch}`,
          label: t(`journal.disciplines.${discipline}`),
          color: disciplineColor(discipline),
        });
      }
      rows.set(time, { ...rows.get(time), time, [`${discipline}:${stretch}`]: c.score });
      previous = time;
    }
  }
  const data = [...rows.values()].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
  // Round bounds, so the axis reads 450 / 500 / 550… whatever the scores are.
  const scores = scored.map((c) => c.score);
  const low = Math.floor(Math.min(...scores) / SCORE_STEP) * SCORE_STEP;
  const high = Math.max(low + SCORE_STEP, Math.ceil(Math.max(...scores) / SCORE_STEP) * SCORE_STEP);
  const ticks = Array.from(
    { length: (high - low) / SCORE_STEP + 1 },
    (_, i) => low + i * SCORE_STEP,
  );

  return (
    <StatsCard title={t('stats.scores')}>
      {scored.length === 0 ? (
        <Empty>{t('stats.noScores')}</Empty>
      ) : (
        <>
          <Text size="sm" c="dimmed">
            {t('stats.scoresHint')}
          </Text>
          <LineChart
            {...CHART_CHROME}
            data={data}
            dataKey="time"
            series={series}
            curveType="linear"
            connectNulls
            dotProps={{ r: 4, strokeWidth: 2, stroke: 'var(--mantine-color-body)' }}
            activeDotProps={{ r: 6, strokeWidth: 2, stroke: 'var(--mantine-color-body)' }}
            valueFormatter={number}
            yAxisProps={{ domain: [low, high], ticks }}
            xAxisProps={{
              type: 'number',
              scale: 'time',
              domain: [toTime(period.startDate), toTime(period.endDate)],
              ticks: monthTicks(period.startDate, period.endDate),
              tickFormatter: month,
            }}
            referenceLines={referenceToday(period, today, t('stats.today'))}
            tooltipProps={{
              content: ({ label, payload }) => (
                <ChartTooltip
                  label={label === undefined ? undefined : day(Number(label))}
                  payload={payload}
                  series={series}
                  valueFormatter={number}
                />
              ),
            }}
          />
          {/* One entry per discipline (not per line): the name tells two lines apart for sure. */}
          <Group gap="md" justify="center">
            {disciplines.map((d) => (
              <Text key={d} size="sm">
                <span className={classes.swatch} style={{ background: disciplineColor(d) }} />
                {t(`journal.disciplines.${d}`)}
              </Text>
            ))}
          </Group>
        </>
      )}
    </StatsCard>
  );
}

/** A quiet vertical marker for today, when it falls within the season. */
function referenceToday(period: Period, today: string, label: string) {
  if (today < period.startDate || today > period.endDate) return [];
  return [
    {
      x: toTime(today),
      label,
      color: 'var(--viz-today)',
      labelPosition: 'insideTopLeft' as const,
    },
  ];
}

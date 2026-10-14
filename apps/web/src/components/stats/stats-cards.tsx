'use client';

import { AreaChart, ChartTooltip, LineChart } from '@mantine/charts';
import { Card, Group, SegmentedControl, Stack, Table, Text, Title } from '@mantine/core';
import { IconDots } from '@tabler/icons-react';
import type { CompetitionStat, JournalStats, ScoreStat, SessionType } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useFormatter, useTranslations } from 'next-intl';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { AnchorLink } from '@/components/links';
import { FEELING_INK, FEELINGS } from '@/components/journal/feelings';
import type { EventIconComponent } from '@/components/journal/image-icon';
import {
  DISCIPLINE_ORDER,
  SESSION_TYPE_ORDER,
  SESSION_TYPES,
} from '@/components/journal/session-types';
import { CHART_CHROME, disciplineColor, monthTicks, type Period, toTime } from './chart-utils';
import classes from './stats.module.css';

/** Two scored events of a discipline further apart than this are not joined by a line. */
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

/** A card's choice bar, centred at its top: buttons side by side, all as wide. */
function ChoiceBar<T extends string>({
  value,
  onChange,
  label,
  data,
  width,
  size,
}: {
  value: T;
  onChange: (value: T) => void;
  label: string;
  data: { value: T; label: ReactNode }[];
  width: number;
  /** Smaller text, so longer labels fit the same buttons. */
  size?: 'xs';
}) {
  return (
    <Group justify="center">
      <SegmentedControl
        fullWidth
        size={size}
        w={width}
        maw="100%"
        classNames={{ control: classes.equalSegment }}
        value={value}
        onChange={(v) => onChange(v as T)}
        aria-label={label}
        data={data}
      />
    </Group>
  );
}

/** The period up to today (or to its last day once it is over). */
function untilToday(period: Period, today: string): Period {
  const end =
    today > period.endDate ? period.endDate : today < period.startDate ? period.startDate : today;
  return { startDate: period.startDate, endDate: end };
}

/**
 * A time axis with today among its ticks, written `todayLabel` ("Auj."): the dates too close
 * to it (within a tenth of the span) make room for it.
 */
function withToday(
  dateTicks: number[],
  dateLabel: (time: number) => string,
  shown: Period,
  today: string,
  todayLabel: string,
) {
  const todayTime = toTime(today);
  const hasToday = today >= shown.startDate && today <= shown.endDate;
  const minGap = (toTime(shown.endDate) - toTime(shown.startDate)) / 10;
  return {
    ticks: hasToday
      ? [...dateTicks.filter((time) => Math.abs(time - todayTime) >= minGap), todayTime].sort(
          (a, b) => a - b,
        )
      : dateTicks,
    tickFormatter: (time: number) =>
      hasToday && time === todayTime ? todayLabel : dateLabel(time),
  };
}

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

/** The spans the arrows card offers: the last 7, 30 or 90 days, or the whole period. */
const RANGES = ['7', '30', '90', 'all'] as const;
/** The spans of the distribution cards (events, feelings): longer, so the bars mean something. */
const SHARE_RANGES = ['30', '90', '180', 'all'] as const;
type ArrowRange = (typeof RANGES)[number];
type ShareRange = (typeof SHARE_RANGES)[number];
type SpanRange = ArrowRange | ShareRange;

/**
 * The days shown for a range, up to today (or to the period's last day once it is over): the
 * last n days (from the period's first day at most), or the whole period so far for "all".
 */
function rangeWindow(range: SpanRange, period: Period, today: string): Period {
  const sofar = untilToday(period, today);
  if (range === 'all') return sofar;
  const end = sofar.endDate;
  const start = dayjs(end)
    .subtract(Number(range) - 1, 'day')
    .format('YYYY-MM-DD');
  return { startDate: start < period.startDate ? period.startDate : start, endDate: end };
}

/** Axis ticks of a range: every day over a week, every Monday (every other one over 90 days). */
function dayTicks(range: Exclude<ArrowRange, 'all'>, shown: Period): number[] {
  const ticks: number[] = [];
  let day = dayjs(shown.startDate);
  if (range !== '7') day = day.add((8 - day.day()) % 7, 'day');
  const step = range === '7' ? 1 : range === '30' ? 7 : 14;
  for (; !day.isAfter(dayjs(shown.endDate)); day = day.add(step, 'day')) {
    ticks.push(toTime(day.format('YYYY-MM-DD')));
  }
  return ticks;
}

/**
 * Running total of arrows over a span chosen in the card (the last 7, 30, 90 days, or the
 * whole period so far), all types of events together; it starts from zero on the span's
 * first day and never goes past today.
 */
export function ArrowsCard({
  period,
  arrowsByDay,
  today,
}: {
  /** The season (or all time): "all" spans it up to today. */
  period: Period;
  arrowsByDay: JournalStats['arrowsByDay'];
  today: string;
}) {
  const t = useTranslations('stats');
  const format = useFormatter();
  const { day, month, number } = useDates();
  const [range, setRange] = useState<ArrowRange>('7');
  const shown = rangeWindow(range, period, today);

  const data = [{ time: toTime(shown.startDate), arrows: 0 }];
  for (const { date, arrows } of arrowsByDay) {
    if (date < shown.startDate || date > shown.endDate) continue;
    data.push({ time: toTime(date), arrows: (data.at(-1)?.arrows ?? 0) + arrows });
  }
  const total = data.at(-1)?.arrows ?? 0;
  // The curve runs to the span's end (today), the last days without arrows included.
  if ((data.at(-1)?.time ?? 0) < toTime(shown.endDate)) {
    data.push({ time: toTime(shown.endDate), arrows: total });
  }
  const dateTicks =
    range === 'all' ? monthTicks(shown.startDate, shown.endDate) : dayTicks(range, shown);
  const dateLabel =
    range === 'all'
      ? month
      : range === '7'
        ? (time: number) => format.dateTime(new Date(time), { weekday: 'short', day: 'numeric' })
        : (time: number) => format.dateTime(new Date(time), { day: 'numeric', month: 'short' });
  const { ticks, tickFormatter } = withToday(dateTicks, dateLabel, shown, today, t('todayShort'));

  return (
    <StatsCard title={t('cumulativeArrows')}>
      {arrowsByDay.length === 0 ? (
        <Empty>{t('noArrows')}</Empty>
      ) : (
        <>
          <ChoiceBar
            value={range}
            onChange={setRange}
            label={t('range.label')}
            data={RANGES.map((value) => ({ value, label: t(`range.${value}`) }))}
            width={320}
          />
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
              domain: [toTime(shown.startDate), toTime(shown.endDate)],
              ticks,
              tickFormatter,
            }}
            // The line only: "Auj." is written on the axis.
            referenceLines={referenceToday(shown, today)}
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

/** The events the scores chart can show: one reviewed type, or all three together. */
const SCORE_TYPES = ['COMPETITION', 'TRAINING', 'COACHING', 'all'] as const;
type ScoreType = (typeof SCORE_TYPES)[number];

/**
 * Scores over the period up to today, one line per discipline practised, for the events of
 * a type chosen in the card (competitions by default), or of the three types together.
 */
export function ScoresCard({
  period,
  scores: allScores,
  today,
}: {
  /** The season (or all time), shown up to today. */
  period: Period;
  scores: ScoreStat[];
  today: string;
}) {
  const t = useTranslations();
  const { day, month, number } = useDates();
  const [type, setType] = useState<ScoreType>('COMPETITION');
  const shown = untilToday(period, today);

  const scored = allScores.filter(
    (s) =>
      (type === 'all' || s.type === type) && s.date >= shown.startDate && s.date <= shown.endDate,
  );
  const disciplines = DISCIPLINE_ORDER.filter((d) => scored.some((c) => c.discipline === d));
  // A discipline is drawn as one line per stretch of events: after a long break (the
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
  const axis = withToday(
    monthTicks(shown.startDate, shown.endDate),
    month,
    shown,
    today,
    t('stats.todayShort'),
  );

  return (
    <StatsCard title={t('stats.scores')}>
      {allScores.length === 0 ? (
        <Empty>{t('stats.noScores')}</Empty>
      ) : (
        <>
          <ChoiceBar
            value={type}
            onChange={setType}
            label={t('stats.scoreTypes.label')}
            // Abbreviated on the buttons; the full name on hover and for screen readers.
            data={SCORE_TYPES.map((value) => ({
              value,
              label: (
                <span title={t(`stats.scoreTypes.${value}`)}>
                  <span aria-hidden>{t(`stats.scoreTypes.short.${value}`)}</span>
                  <span className={classes.srOnly}>{t(`stats.scoreTypes.${value}`)}</span>
                </span>
              ),
            }))}
            width={440}
          />
          <Text size="sm" c="dimmed">
            {t('stats.scoresHint')}
          </Text>
          {scored.length === 0 ? (
            <Empty>{t('stats.noScoresOfType')}</Empty>
          ) : (
            <>
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
                  domain: [toTime(shown.startDate), toTime(shown.endDate)],
                  ticks: axis.ticks,
                  tickFormatter: axis.tickFormatter,
                }}
                // The line only: "Auj." is written on the axis.
                referenceLines={referenceToday(shown, today)}
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
        </>
      )}
    </StatsCard>
  );
}

/**
 * The bars of the events card: the built-in types, then "other" for the rest (the archer's
 * own types, and the older "Divers" events).
 */
const EVENT_CATEGORIES: {
  key: SessionType | 'other';
  types: SessionType[];
  color: string;
  icon: EventIconComponent;
}[] = [
  ...SESSION_TYPE_ORDER.map((type) => ({
    key: type,
    types: [type],
    color: SESSION_TYPES[type].color,
    icon: SESSION_TYPES[type].icon,
  })),
  { key: 'other', types: ['CUSTOM', 'OTHER'], color: 'gray', icon: IconDots },
];

/**
 * How the archer's events split between types over a span chosen in the card (the last 7,
 * 30, 90 days, or the whole period so far): one bar per type, above its icon.
 */
export function EventsCard({
  period,
  eventsByDay,
  today,
}: {
  /** The season (or all time): "all" spans it up to today. */
  period: Period;
  eventsByDay: JournalStats['eventsByDay'];
  today: string;
}) {
  const t = useTranslations();
  const { number } = useDates();
  const [range, setRange] = useState<ShareRange>('30');
  const shown = rangeWindow(range, period, today);

  const inSpan = eventsByDay.filter((d) => d.date >= shown.startDate && d.date <= shown.endDate);
  const bars = EVENT_CATEGORIES.map(({ key, types, color, icon: Icon }) => ({
    key,
    label: key === 'other' ? t('stats.otherEvents') : t(`journal.typesShort.${key}`),
    count: inSpan.filter((d) => types.includes(d.type)).reduce((sum, d) => sum + d.count, 0),
    color: `var(--mantine-color-${color}-filled)`,
    icon: <Icon size={36} color={`var(--mantine-color-${color}-filled)`} />,
  }));
  const total = bars.reduce((sum, bar) => sum + bar.count, 0);

  return (
    <StatsCard title={t('stats.events')}>
      {eventsByDay.length === 0 ? (
        <Empty>{t('stats.noEvents')}</Empty>
      ) : (
        <>
          <ChoiceBar
            value={range}
            onChange={setRange}
            label={t('stats.range.label')}
            data={SHARE_RANGES.map((value) => ({ value, label: t(`stats.range.${value}`) }))}
            width={320}
            // "180 jours" fits its button in the smaller text.
            size="xs"
          />
          <div>
            <Text className={classes.figure}>{number(total)}</Text>
            <Text size="sm" c="dimmed">
              {t('stats.eventsTotal')}
            </Text>
          </div>
          <BarColumns bars={bars} />
        </>
      )}
    </StatsCard>
  );
}

/**
 * A small histogram: one column per value, its count above its bar (as high as its share of
 * the tallest), then its icon and name. `outlined`: pale bars get a thin edge.
 */
function BarColumns({
  bars,
  outlined = false,
}: {
  bars: { key: string; label: string; count: number; color: string; icon: ReactNode }[];
  outlined?: boolean;
}) {
  const { number } = useDates();
  const highest = Math.max(1, ...bars.map((bar) => bar.count));
  return (
    <ul className={classes.bars} style={{ '--bar-count': bars.length } as CSSProperties}>
      {bars.map(({ key, label, count, color, icon }) => (
        <li key={key} className={classes.barColumn} aria-label={`${label} : ${count}`}>
          <Text size="sm" fw={600} className={classes.numeric} aria-hidden>
            {number(count)}
          </Text>
          <div className={classes.barTrack} aria-hidden>
            <div
              className={classes.bar}
              data-outlined={outlined || undefined}
              style={{ height: `${(count / highest) * 100}%`, background: color }}
            />
          </div>
          <div aria-hidden>{icon}</div>
          <Text size="xs" ta="center" lh={1.2} aria-hidden>
            {label}
          </Text>
        </li>
      ))}
    </ul>
  );
}

/**
 * The physical or mental feeling noted on the events over a span chosen in the card (the
 * last 7, 30, 90 days, or the whole period so far): one bar per face, in the face's pastel.
 */
export function FeelingsCard({
  kind,
  period,
  feelingsByDay,
  today,
}: {
  kind: 'physical' | 'mental';
  /** The season (or all time): "all" spans it up to today. */
  period: Period;
  feelingsByDay: JournalStats['physicalFeelingsByDay'];
  today: string;
}) {
  const t = useTranslations();
  const { number } = useDates();
  const [range, setRange] = useState<ShareRange>('30');
  const shown = rangeWindow(range, period, today);

  const inSpan = feelingsByDay.filter((d) => d.date >= shown.startDate && d.date <= shown.endDate);
  const bars = FEELINGS.map(({ value, icon: Icon, color }) => ({
    key: value,
    label: t(`journal.feelings.${value}`),
    count: inSpan.filter((d) => d.feeling === value).reduce((sum, d) => sum + d.count, 0),
    color,
    // The face as on the sheet once chosen: dark, on its pastel.
    icon: (
      <span className={classes.face} style={{ background: color }}>
        <Icon size={30} color={FEELING_INK} />
      </span>
    ),
  }));
  const total = bars.reduce((sum, bar) => sum + bar.count, 0);

  return (
    <StatsCard title={t(`stats.feelings.${kind}.title`)}>
      {feelingsByDay.length === 0 ? (
        <Empty>{t(`stats.feelings.${kind}.none`)}</Empty>
      ) : (
        <>
          <ChoiceBar
            value={range}
            onChange={setRange}
            label={t('stats.range.label')}
            data={SHARE_RANGES.map((value) => ({ value, label: t(`stats.range.${value}`) }))}
            width={320}
            // "180 jours" fits its button in the smaller text.
            size="xs"
          />
          <div>
            <Text className={classes.figure}>{number(total)}</Text>
            <Text size="sm" c="dimmed">
              {t(`stats.feelings.${kind}.total`)}
            </Text>
          </div>
          <BarColumns bars={bars} outlined />
        </>
      )}
    </StatsCard>
  );
}

/** A quiet vertical line for today, when it falls within the span ("Auj." is on the axis). */
function referenceToday(period: Period, today: string) {
  if (today < period.startDate || today > period.endDate) return [];
  return [{ x: toTime(today), color: 'var(--viz-today)' }];
}

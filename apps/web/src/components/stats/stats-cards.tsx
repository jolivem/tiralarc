'use client';

import { AreaChart, ChartTooltip, LineChart } from '@mantine/charts';
import {
  Card,
  Group,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconSelector } from '@tabler/icons-react';
import type {
  CompetitionStat,
  Discipline,
  Indicator,
  JournalStats,
  ScoreStat,
} from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import {
  createContext,
  type CSSProperties,
  type ReactNode,
  use,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { OnRuling } from '@/components/notebook/on-ruling';
import { AnchorLink } from '@/components/links';
import { FEELING_INK, FEELINGS } from '@/components/journal/feelings';
import {
  DISCIPLINE_ORDER,
  SESSION_TYPE_ORDER,
  SESSION_TYPES,
} from '@/components/journal/session-types';
import { CHART_CHROME, disciplineColor, monthTicks, type Period, toTime } from './chart-utils';
import { FavoriteStar } from './favorite';
import classes from './stats.module.css';

/** Two scored events of a discipline further apart than this are not joined by a line. */
const MAX_GAP_MS = 60 * 86_400_000;
const SCORE_STEP = 50;

/** Cards on a ruled page (the home notebook) write their titles on its lines. */
export const RuledCardTitles = createContext(false);

/**
 * Cards printed in the PDF extract (components/print): no frame, no choice bar, the whole
 * period shown (all event types for the scores), every competition listed.
 */
export const PrintedCards = createContext(false);

/**
 * A card's title, in the calligraphy font the archer chose on the Profile page, written on
 * a line of the squared paper (see `.cardTitle`) — or of a ruled page (`RuledCardTitles`).
 */
export function StatsCardTitle({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  // On the home notebook's ruled page: on its lines, as big as the page's other titles
  // (RuledHeading).
  if (use(RuledCardTitles)) {
    return (
      <OnRuling
        as="h2"
        lines={2}
        style={{
          fontFamily: 'var(--font-calendar, var(--font-hand)), cursive',
          fontSize: '2rem',
          fontWeight: 'var(--card-title-weight, 400)' as CSSProperties['fontWeight'],
        }}
      >
        {/* `aside` (the star) at the end of the line, level with the title. */}
        <span className={classes.ruledTitle}>
          <span>{children}</span>
          {aside}
        </span>
      </OnRuling>
    );
  }
  return (
    <Title
      order={2}
      className={classes.cardTitle}
      ff="var(--font-calendar, var(--font-hand)), cursive"
      fz="1.7rem"
      // Bold on the home page, which sets the variable (archer/home.module.css).
      fw="var(--card-title-weight, 400)"
      lh={1}
    >
      {children}
    </Title>
  );
}

/**
 * A see-through card on the notebook's squared paper (`--square`): its height is rounded up
 * to whole squares, so the cards after it — and their titles — stay on the grid. Measured
 * from its content (the card itself may be stretched to its row's height), whenever that
 * content's size changes. Also places its top right square (`--corner-x` / `--corner-y`:
 * the centre of the last whole square of the second row, inside the frame), for the star.
 */
export function SquaredCard({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const card = ref.current;
    const content = card?.firstElementChild;
    if (!card || !content) return;
    const snap = () => {
      const style = getComputedStyle(card);
      const square = parseFloat(style.getPropertyValue('--square'));
      if (!square) return;
      const frame = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'] as const;
      const height =
        content.getBoundingClientRect().height +
        frame.reduce((sum, side) => sum + parseFloat(style[side]), 0);
      card.style.minHeight = `${Math.ceil(height / square - 0.01) * square}px`;

      // The paper's squares start at the page's left edge; the card's top is on a line.
      const page = card.closest('section');
      if (!page) return;
      const box = card.getBoundingClientRect();
      const left = parseFloat(style.borderLeftWidth);
      const innerRight =
        box.right - parseFloat(style.borderRightWidth) - page.getBoundingClientRect().left;
      const lastColumn = Math.floor(innerRight / square) - 1;
      const centre = page.getBoundingClientRect().left + (lastColumn + 0.5) * square;
      // Absolute positions start inside the border.
      card.style.setProperty('--corner-x', `${centre - box.left - left}px`);
      card.style.setProperty('--corner-y', `${square * 1.5 - parseFloat(style.borderTopWidth)}px`);
    };
    snap();
    const observer = new ResizeObserver(snap);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <Card
      ref={ref}
      withBorder
      radius="lg"
      // A thick ink frame; border + padding = one square.
      p={18}
      style={{ borderWidth: 2, borderColor: 'var(--frame-color)' }}
      bg="transparent"
      className={`${classes.squaredCard} ${className ?? ''}`}
    >
      {children}
    </Card>
  );
}

/** An indicator's card: its title, with the star choosing it for the home page on the right. */
function StatsCard({
  title,
  indicator,
  children,
}: {
  title: string;
  indicator: Indicator;
  children: ReactNode;
}) {
  const star = <FavoriteStar indicator={indicator} />;
  // On a ruled page the title is pushed onto a line: the star goes along with it.
  const ruled = use(RuledCardTitles);
  if (use(PrintedCards)) {
    return (
      <section className={`${classes.viz} ${classes.printedCard}`}>
        <Stack gap="sm">
          <StatsCardTitle>{title}</StatsCardTitle>
          {children}
        </Stack>
      </section>
    );
  }
  return (
    <SquaredCard className={classes.viz}>
      <Stack gap="md">
        <StatsCardTitle aside={ruled ? star : undefined}>{title}</StatsCardTitle>
        {children}
      </Stack>
      {/* In the centre of the top right square (see SquaredCard). */}
      {!ruled && <div className={classes.cornerStar}>{star}</div>}
    </SquaredCard>
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
  // On paper, nothing to choose: the card shows its widest choice.
  if (use(PrintedCards)) return null;
  return (
    <Group justify="center">
      <SegmentedControl
        fullWidth
        size={size}
        w={width}
        maw="100%"
        classNames={{ root: classes.choiceBar, control: classes.equalSegment }}
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
    /** A day in digits, two of each: 28/08/27 in French. */
    shortDay: (date: string) =>
      format.dateTime(new Date(toTime(date)), {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
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

type CompetitionSortKey = 'date' | 'discipline' | 'score' | 'location';
type SortDirection = 'asc' | 'desc';

/** A column header that sorts the table by its column: ascending first, then reversed. */
function SortHeader({
  column,
  sort,
  onSort,
  children,
}: {
  column: CompetitionSortKey;
  sort: { key: CompetitionSortKey; direction: SortDirection };
  onSort: (column: CompetitionSortKey) => void;
  children: ReactNode;
}) {
  const active = sort.key === column;
  const Icon = !active ? IconSelector : sort.direction === 'asc' ? IconChevronUp : IconChevronDown;
  // Scores are right-aligned, like their figures.
  const right = column === 'score';
  return (
    <Table.Th
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      visibleFrom={column === 'location' ? 'sm' : undefined}
      ta={right ? 'right' : undefined}
    >
      <UnstyledButton onClick={() => onSort(column)} fz="inherit" fw="inherit" c="inherit">
        <Group gap={4} wrap="nowrap" justify={right ? 'flex-end' : undefined}>
          {children}
          <Icon size={14} stroke={2} aria-hidden />
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

/**
 * The period's competitions, most recent first; each one opens its sheet. A click on a
 * column header sorts by it (dates and scores ascending, disciplines and places A to Z),
 * a second click reverses; competitions without that value always come last.
 */
export function CompetitionsCard({ competitions }: { competitions: CompetitionStat[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const printed = use(PrintedCards);
  const { shortDay, number } = useDates();
  // The disciplines competed in, in the usual order; one shown, or all.
  const disciplines = DISCIPLINE_ORDER.filter((d) => competitions.some((c) => c.discipline === d));
  const [picked, setPicked] = useState<Discipline | 'all'>('all');
  // A discipline no longer in the list (another period chosen) shows them all.
  const discipline = picked !== 'all' && disciplines.includes(picked) ? picked : 'all';
  const [sort, setSort] = useState<{ key: CompetitionSortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc',
  });
  const onSort = (key: CompetitionSortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  const valueOf = (c: CompetitionStat): string | number | null => {
    switch (sort.key) {
      case 'date':
        return c.date;
      case 'score':
        return c.score;
      case 'discipline':
        return c.discipline ? t(`journal.disciplines.${c.discipline}`) : null;
      case 'location':
        return c.location || null;
    }
  };
  const rows = competitions
    .filter((c) => discipline === 'all' || c.discipline === discipline)
    .sort((a, b) => {
      const [x, y] = [valueOf(a), valueOf(b)];
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      const order =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), locale, { sensitivity: 'base' });
      return sort.direction === 'asc' ? order : -order;
    });

  return (
    <StatsCard title={t('stats.competitions')} indicator="COMPETITIONS">
      {competitions.length === 0 ? (
        <Empty>{t('stats.noCompetitions')}</Empty>
      ) : (
        <>
          {/* A choice only with two disciplines or more. */}
          {disciplines.length > 1 && (
            <ChoiceBar
              value={discipline}
              onChange={setPicked}
              label={t('stats.disciplineShown')}
              data={[
                { value: 'all' as const, label: t('stats.range.all') },
                ...disciplines.map((d) => ({ value: d, label: t(`journal.disciplines.${d}`) })),
              ]}
              width={72 * (disciplines.length + 1)}
              size="xs"
            />
          )}
          {/* One line per competition, as wide as the card: a long place is cut short. */}
          <Table.ScrollContainer
            minWidth={0}
            type="native"
            className={classes.tableBox}
            // Printed: all the rows, nothing to scroll.
            style={printed ? { maxHeight: 'none' } : undefined}
          >
            <Table
              // Compact rows: 5px above and below the text.
              verticalSpacing={5}
              fz="xs"
              stickyHeader
              borderColor="var(--viz-grid)"
              style={{ whiteSpace: 'nowrap' }}
            >
              {/* Pastel pink (stats.module.css), opaque: rows scroll under it without showing. */}
              <Table.Thead>
                <Table.Tr>
                  <SortHeader column="date" sort={sort} onSort={onSort}>
                    {t('stats.date')}
                  </SortHeader>
                  <SortHeader column="discipline" sort={sort} onSort={onSort}>
                    {t('journal.discipline')}
                  </SortHeader>
                  <SortHeader column="score" sort={sort} onSort={onSort}>
                    {t('journal.score')}
                  </SortHeader>
                  <SortHeader column="location" sort={sort} onSort={onSort}>
                    {t('journal.location')}
                  </SortHeader>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td>
                      <AnchorLink href={`/archer/journal/${c.id}`} size="xs">
                        {shortDay(c.date)}
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
                    <Table.Td ta="right" fw={600} className={classes.numeric}>
                      {c.score === null ? '—' : number(c.score)}
                    </Table.Td>
                    <Table.Td
                      visibleFrom="sm"
                      c="dimmed"
                      className={classes.clipped}
                      title={c.location ?? undefined}
                    >
                      {c.location ?? ''}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </>
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
 * whole period so far), all types of events together.
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
  const { number } = useDates();
  return (
    <CumulativeCard
      title={t('cumulativeArrows')}
      indicator="ARROWS"
      empty={t('noArrows')}
      period={period}
      today={today}
      byDay={arrowsByDay.map(({ date, arrows }) => ({ date, amount: arrows }))}
      seriesLabel={t('arrows')}
      unit={t('arrowsTotal')}
      formatter={number}
      color="var(--series-1)"
    />
  );
}

/**
 * Running total of the time spent over a span chosen in the card (as for the arrows), all
 * types of events together: hours and minutes.
 */
export function DurationsCard({
  period,
  durationsByDay,
  today,
}: {
  /** The season (or all time): "all" spans it up to today. */
  period: Period;
  durationsByDay: JournalStats['durationsByDay'];
  today: string;
}) {
  const t = useTranslations('stats');
  const format = useFormatter();
  // 45 min, 2 h, 12 h 05.
  const duration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const rest = Math.round(minutes % 60);
    if (hours === 0) return t('minutes', { minutes: rest });
    return rest === 0
      ? t('hours', { hours: format.number(hours) })
      : t('hoursMinutes', { hours: format.number(hours), minutes: String(rest).padStart(2, '0') });
  };
  return (
    <CumulativeCard
      title={t('cumulativeDurations')}
      indicator="DURATIONS"
      empty={t('noDurations')}
      period={period}
      today={today}
      byDay={durationsByDay.map(({ date, minutes }) => ({ date, amount: minutes }))}
      seriesLabel={t('duration')}
      formatter={duration}
      color="var(--series-3)"
    />
  );
}

/**
 * A running total over a span chosen in the card (the last 7, 30, 90 days, or the whole
 * period so far): the total in figures, then its curve, which starts from zero on the
 * span's first day and never goes past today.
 */
function CumulativeCard({
  title,
  indicator,
  empty,
  period,
  today,
  byDay,
  seriesLabel,
  unit,
  formatter,
  color,
}: {
  title: string;
  indicator: Indicator;
  /** Shown instead when nothing was recorded. */
  empty: string;
  period: Period;
  today: string;
  /** Days with something recorded, oldest first. */
  byDay: { date: string; amount: number }[];
  seriesLabel: string;
  /** Written after the total, if the formatter does not say it. */
  unit?: string;
  /** Total, axis and tooltip values. */
  formatter: (value: number) => string;
  color: string;
}) {
  const t = useTranslations('stats');
  const format = useFormatter();
  const { day, month } = useDates();
  const [range, setRange] = useState<ArrowRange>(use(PrintedCards) ? 'all' : '7');
  const shown = rangeWindow(range, period, today);
  const series = [{ name: 'amount', label: seriesLabel, color }];

  const data = [{ time: toTime(shown.startDate), amount: 0 }];
  for (const { date, amount } of byDay) {
    if (date < shown.startDate || date > shown.endDate) continue;
    data.push({ time: toTime(date), amount: (data.at(-1)?.amount ?? 0) + amount });
  }
  const total = data.at(-1)?.amount ?? 0;
  // The curve runs to the span's end (today), the last days without anything included.
  if ((data.at(-1)?.time ?? 0) < toTime(shown.endDate)) {
    data.push({ time: toTime(shown.endDate), amount: total });
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
    <StatsCard title={title} indicator={indicator}>
      {byDay.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <>
          <ChoiceBar
            value={range}
            onChange={setRange}
            label={t('range.label')}
            data={RANGES.map((value) => ({ value, label: t(`range.${value}`) }))}
            width={320}
            size="xs"
          />
          <Group justify="center" align="baseline" gap={6}>
            <Text className={classes.figure}>{formatter(total)}</Text>
            {unit && (
              <Text size="sm" c="dimmed">
                {unit}
              </Text>
            )}
          </Group>
          <AreaChart
            {...CHART_CHROME}
            data={data}
            dataKey="time"
            series={series}
            curveType="linear"
            withGradient={false}
            fillOpacity={0.1}
            withDots={false}
            activeDotProps={{ r: 4, strokeWidth: 2, stroke: 'var(--mantine-color-body)' }}
            valueFormatter={formatter}
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
                  series={series}
                  valueFormatter={formatter}
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
  const [type, setType] = useState<ScoreType>(use(PrintedCards) ? 'all' : 'COMPETITION');
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
    <StatsCard title={t('stats.scores')} indicator="SCORES">
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
            width={320}
            size="xs"
          />
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
 * How the archer's events split between the built-in types over a span chosen in the card
 * (the last 7, 30, 90 days, or the whole period so far): one bar per type, above its icon.
 * Custom and "Divers" events are left out.
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
  const [range, setRange] = useState<ShareRange>(use(PrintedCards) ? 'all' : '30');
  const shown = rangeWindow(range, period, today);

  const inSpan = eventsByDay.filter((d) => d.date >= shown.startDate && d.date <= shown.endDate);
  const bars = SESSION_TYPE_ORDER.map((type) => {
    const { color, icon: Icon } = SESSION_TYPES[type];
    return {
      key: type,
      label: t(`journal.typesShort.${type}`),
      count: inSpan.filter((d) => d.type === type).reduce((sum, d) => sum + d.count, 0),
      // The type's colour in pastel; its icon below keeps the full colour.
      color: `var(--mantine-color-${color}-3)`,
      icon: <Icon size={36} color={`var(--mantine-color-${color}-filled)`} />,
    };
  });

  return (
    <StatsCard title={t('stats.events')} indicator="EVENTS">
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
          <BarColumns bars={bars} outlined />
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
  const [range, setRange] = useState<ShareRange>(use(PrintedCards) ? 'all' : '30');
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

  return (
    <StatsCard
      title={t(`stats.feelings.${kind}.title`)}
      indicator={kind === 'physical' ? 'PHYSICAL_FEELINGS' : 'MENTAL_FEELINGS'}
    >
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

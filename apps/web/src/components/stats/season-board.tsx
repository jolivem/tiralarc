'use client';

import { Button, Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconReportAnalytics } from '@tabler/icons-react';
import type { Journal } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { type CSSProperties, type ReactNode, useState } from 'react';
import type { SeasonSummary } from '@/lib/season-summary';
import type { BoardFigure, BoardPaper } from './board-card';
import { SeasonShareButton } from './season-actions';
import classes from './season-board.module.css';

/** Marker colours, as on a real board. */
const INKS = { blue: '#1f4fa8', red: '#c62828', green: '#2e7d32', black: '#26292d' } as const;
type Ink = keyof typeof INKS;

/** A magnet's colour, and a paper's look. */
type Magnet = 'red' | 'blue' | 'yellow' | 'green';
type PaperKind = 'ruled' | 'squared' | 'sticky';

/** A sheet of paper held on the board by a magnet, a little askew. */
function Paper({
  title,
  kind,
  magnet,
  tilt,
  children,
}: {
  title: string;
  kind: PaperKind;
  magnet: Magnet;
  /** Degrees. */
  tilt: number;
  children: ReactNode;
}) {
  return (
    <section
      className={classes.paper}
      data-kind={kind}
      style={{ '--tilt': `${tilt}deg` } as CSSProperties}
    >
      <span className={classes.magnet} data-color={magnet} aria-hidden />
      <h3 className={classes.paperTitle}>{title}</h3>
      {children}
    </section>
  );
}

/** A figure written in marker on the board: the number large, its name under it. */
function Figure({
  value,
  label,
  detail,
  ink,
}: {
  value: string;
  label: string;
  detail?: string;
  ink: Ink;
}) {
  return (
    <div className={classes.figure} style={{ color: INKS[ink] }}>
      <div className={classes.figureValue}>{value}</div>
      <div className={classes.figureLabel}>{label}</div>
      {detail && <div className={classes.figureDetail}>{detail}</div>}
    </div>
  );
}

/**
 * "Bilan de saison" on the Indicators page (a journal's period): the season summary
 * (`lib/season-summary.ts`) in a window over the page, closed by its cross. Drawn as a
 * whiteboard: the season's name and its figures written in marker, papers held by magnets for
 * the best scores, the averages per arrow (and how they moved) and the goals reached; on the
 * board's tray, its Instagram card (like a session's).
 */
export function SeasonBoardButton({
  summary: s,
  journal,
}: {
  summary: SeasonSummary;
  journal: Pick<Journal, 'title' | 'startDate' | 'endDate'>;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const isPhone = useMediaQuery('(max-width: 48em)');
  const [opened, setOpened] = useState(false);

  const number = (value: number) => format.number(value);
  const points = (value: number) =>
    format.number(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' });
  const time = t('season.hoursValue', {
    hours: Math.floor(s.minutes / 60),
    minutes: String(s.minutes % 60).padStart(2, '0'),
  });
  const byType = (['TRAINING', 'COACHING', 'COMPETITION', 'STRENGTH'] as const)
    .filter((type) => s.events[type] > 0)
    .map((type) => t(`season.types.${type}`, { count: s.events[type] }))
    .join(' · ');

  // The Instagram card: the same board (board-card.ts), its figures and papers worded here.
  const cardFigures: BoardFigure[] = [
    { key: 'events', label: t('season.events'), value: number(s.events.total), ink: 'red' },
    { key: 'arrows', label: t('season.arrows'), value: number(s.arrows), ink: 'blue' },
    { key: 'time', label: t('season.time'), value: time, ink: 'green' },
    { key: 'days', label: t('season.activeDays'), value: number(s.activeDays), ink: 'black' },
  ];
  const cardPapers: BoardPaper[] = [
    ...(s.bestScores.length > 0
      ? [
          {
            key: 'best',
            title: t('season.bestScores'),
            kind: 'ruled' as const,
            magnet: 'red' as const,
            lines: s.bestScores.map((b) => ({
              label: t(`journal.disciplines.${b.discipline}`),
              big: number(b.score),
              text: [day(b.date), b.location].filter(Boolean).join(' · '),
            })),
          },
        ]
      : []),
    ...(s.averages.length > 0
      ? [
          {
            key: 'averages',
            title: t('season.averages'),
            kind: 'squared' as const,
            magnet: 'blue' as const,
            lines: s.averages.map((a) => {
              const p = s.progressions.find((pr) => pr.distance === a.distance);
              const delta = p ? p.last - p.first : 0;
              return {
                label: t('season.distance', { distance: a.distance }),
                big: points(a.average),
                text: p ? `${points(p.first)} → ${points(p.last)}` : undefined,
                color: delta > 0 ? '#2e7d32' : delta < 0 ? '#c62828' : undefined,
              };
            }),
          },
        ]
      : []),
    ...(s.goalsReached.length > 0
      ? [
          {
            key: 'goals',
            title: t('season.goals'),
            kind: 'sticky' as const,
            magnet: 'green' as const,
            // The tick before the goal, on its line.
            lines: s.goalsReached.map((g) => ({ text: `✓ ${g.description}`, color: '#2f3a4a' })),
          },
        ]
      : []),
  ];

  return (
    <>
      <Button
        variant="light"
        leftSection={<IconReportAnalytics size={18} />}
        onClick={() => setOpened(true)}
      >
        {t('season.open')}
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        // No title bar: the board fills the window, the cross in its top right corner.
        withCloseButton={false}
        fullScreen={isPhone}
        size="min(1100px, 96vw)"
        padding={0}
        radius="md"
        centered
        aria-label={t('season.titleOf', { title: journal.title })}
        classNames={{ content: classes.window }}
      >
        <div className={classes.frame}>
          <div className={classes.board}>
            <button
              type="button"
              className={classes.close}
              onClick={() => setOpened(false)}
              aria-label={t('season.close')}
              title={t('season.close')}
            >
              ×
            </button>
            <header className={classes.header}>
              <h2 className={classes.title} style={{ color: INKS.blue }}>
                {t('season.title')}
              </h2>
              <p className={classes.subtitle} style={{ color: INKS.black }}>
                {journal.title}
                <span className={classes.period}>
                  {' — '}
                  {t('journals.period', {
                    start: day(journal.startDate),
                    end: day(journal.endDate),
                  })}
                </span>
              </p>
            </header>

            {/* Written straight on the board. */}
            <div className={classes.figures}>
              <Figure
                value={number(s.events.total)}
                label={t('season.events')}
                detail={byType || undefined}
                ink="red"
              />
              <Figure value={number(s.arrows)} label={t('season.arrows')} ink="blue" />
              <Figure value={time} label={t('season.time')} ink="green" />
              <Figure value={number(s.activeDays)} label={t('season.activeDays')} ink="black" />
            </div>

            {/* Pinned on with magnets. */}
            <div className={classes.papers}>
              <Paper title={t('season.bestScores')} kind="ruled" magnet="red" tilt={-2}>
                {s.bestScores.length === 0 ? (
                  <p className={classes.empty}>{t('season.noBestScores')}</p>
                ) : (
                  <ul className={classes.list}>
                    {s.bestScores.map((b) => (
                      <li key={b.discipline}>
                        <span className={classes.label}>
                          {t(`journal.disciplines.${b.discipline}`)}
                        </span>
                        <strong className={classes.big}>{number(b.score)}</strong>
                        <span className={classes.muted}>
                          {[day(b.date), b.location].filter(Boolean).join(' · ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Paper>

              <Paper title={t('season.averages')} kind="squared" magnet="blue" tilt={1.5}>
                {s.averages.length === 0 ? (
                  <p className={classes.empty}>{t('season.noAverages')}</p>
                ) : (
                  <ul className={classes.list}>
                    {s.averages.map((a) => {
                      const p = s.progressions.find((pr) => pr.distance === a.distance);
                      const delta = p ? p.last - p.first : 0;
                      return (
                        <li key={a.distance}>
                          <span className={classes.label}>
                            {t('season.distance', { distance: a.distance })}
                          </span>
                          <strong className={classes.big}>{points(a.average)}</strong>
                          <span className={classes.muted}>{t('season.perArrow')}</span>
                          {p && (
                            <span
                              className={classes.trend}
                              data-trend={delta > 0 ? 'up' : delta < 0 ? 'down' : undefined}
                              title={t('season.progressionHint')}
                            >
                              {t('season.progression', {
                                first: points(p.first),
                                last: points(p.last),
                                delta: `${delta >= 0 ? '+' : '−'}${points(Math.abs(delta))}`,
                              })}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Paper>

              <Paper title={t('season.goals')} kind="sticky" magnet="green" tilt={-1}>
                {s.goalsReached.length === 0 ? (
                  <p className={classes.empty}>{t('season.noGoalsReached')}</p>
                ) : (
                  <ul className={classes.list}>
                    {s.goalsReached.map((g) => (
                      <li key={g.id}>
                        <span className={classes.tick} aria-label={t('season.reached')}>
                          ✓
                        </span>
                        <span>{g.description}</span>
                        {g.achievedOn && <span className={classes.muted}>{day(g.achievedOn)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {s.goalsOpen.length > 0 && (
                  <p className={classes.muted}>
                    {t('season.goalsOpen', { count: s.goalsOpen.length })}
                  </p>
                )}
              </Paper>
            </div>
          </div>
          {/* The board's tray, under it: the Instagram card. */}
          <div className={classes.tray}>
            <span className={classes.pen} data-color="blue" aria-hidden />
            <span className={classes.pen} data-color="red" aria-hidden />
            <SeasonShareButton
              title={t('season.title')}
              subtitle={journal.title}
              figures={cardFigures}
              papers={cardPapers}
              fileName={`tiralarc-bilan-${journal.startDate.slice(0, 4)}`}
            />
            <span className={classes.eraser} aria-hidden />
          </div>
        </div>
      </Modal>
    </>
  );
}

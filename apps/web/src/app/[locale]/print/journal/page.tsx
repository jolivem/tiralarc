import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Fragment, type ReactNode } from 'react';
import {
  BLANK_ATTRIBUTE,
  CHAPTER_ATTRIBUTE,
  CHAPTER_PAGE_ATTRIBUTE,
} from '@/components/print/markers';
import { Paginate } from '@/components/print/paginate';
import { PrintSeason } from '@/components/print/print-season';
import { PrintLegend } from '@/components/print/print-legend';
import { PrintMonth } from '@/components/print/print-month';
import { PrintRankings, PrintStats } from '@/components/print/print-parts';
import { PrintReady } from '@/components/print/print-ready';
import { PrintPhotos, PrintSheet } from '@/components/print/print-sheet';
import { PrintYear } from '@/components/print/print-year';
import { SHEET_CATEGORIES } from '@/components/sheets/categories';
import classes from '@/components/print/print.module.css';
import type { Locale } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/current-user';
import { getExportData, monthDecoration, monthStars, periodJournal } from '@/lib/export-data';
import { exportMonths, parseExportOptions } from '@/lib/export-options';
import { seasonSummary } from '@/lib/season-summary';
import { durationLabel, volumeLabel } from '@/lib/strength';

/**
 * The journal's PDF extract, as Chromium prints it (archer/export/route.ts): a cover, the
 * legend of its signs, an index of its chapters, the
 * whole period's calendar on one page (its events' colours and their legend), then chapters, each opened by a title page: Indicators (the national rankings and the
 * indicators, if asked for), Journal (each month's calendar, followed by that month's sheets
 * by day if asked for, each with its photos), Sheets (the Sheets section's binder: technique,
 * settings, strength and mental sheets). A5, plain paper: no header, tabs or notebook (app-shell).
 */
export default async function PrintJournalPage({
  params,
  searchParams,
}: PageProps<'/[locale]/print/journal'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await getCurrentUser();
  if (!user?.roles.includes('ARCHER')) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') query.set(key, value);
  }
  const options = parseExportOptions(query);
  if (!options) notFound();

  const t = await getTranslations('export');
  const tArcher = await getTranslations('archer');
  const tSheets = await getTranslations('sheets');
  const tStrength = await getTranslations('strength');
  const format = await getFormatter();
  const data = await getExportData(options);
  const today = new Date().toISOString().slice(0, 10);
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00Z`), { dateStyle: 'long', timeZone: 'UTC' });
  const withStats = options.rankings.length > 0 || options.indicators.length > 0;
  const journal = periodJournal(data.journals, options.from, options.to);
  const firstYear = (journal?.startDate ?? options.from).slice(0, 4);
  const lastYear = (journal?.endDate ?? options.to).slice(0, 4);
  const coverYears = firstYear === lastYear ? firstYear : `${firstYear}-${lastYear}`;
  const chapters = [
    ...(withStats ? [{ id: 'chapter-stats', title: tArcher('stats') }] : []),
    { id: 'chapter-journal', title: tArcher('journal') },
    { id: 'chapter-sheets', title: tArcher('sheets') },
  ];

  return (
    <main className={classes.document}>
      <section className={classes.cover}>
        {/* Lettering: a word a line, white letters outlined in black, a swash, the years. */}
        <h1 className={classes.coverTitle}>
          {t('coverTitle')
            .split(' ')
            .map((word, i) => (
              <span key={i} className={classes.coverWord}>
                {word}
              </span>
            ))}
          <svg className={classes.coverSwash} viewBox="0 0 200 24" aria-hidden>
            <path d="M6 16 C 50 4, 120 2, 194 10 C 140 8, 70 12, 6 20 Z" />
          </svg>
          {/* The journal's season (e.g. 2026-2027), else the extract's own years. */}
          <span className={classes.coverYears}>{coverYears}</span>
        </h1>
        <div className={classes.coverPeriod}>
          {t('period', { from: day(options.from), to: day(options.to) })}
        </div>
      </section>
      <PrintLegend customTypes={data.customTypes} />
      <section className={classes.page}>
        <h2 className={`${classes.heading} ${classes.indexTitle}`}>
          <span className={classes.highlight}>{t('index')}</span>
        </h2>
        <ol className={classes.indexList}>
          {chapters.map(({ id, title }) => (
            <li key={id}>
              <a href={`#${id}`}>
                <span>{title}</span>
                {/* Its first page, written in by lib/pdf.ts once the pages are counted. */}
                <span className={classes.indexPage} {...{ [CHAPTER_PAGE_ATTRIBUTE]: id }} />
              </a>
              {/* The Journal's months, each with its first page. */}
              {id === 'chapter-journal' && (
                <ol className={classes.indexMonths}>
                  {exportMonths(options.from, options.to).map((month) => (
                    <li key={month}>
                      <a href={`#month-${month}`}>
                        <span>
                          {format.dateTime(new Date(`${month}-15T12:00:00Z`), {
                            month: 'long',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}
                        </span>
                        <span
                          className={classes.indexPage}
                          {...{ [CHAPTER_PAGE_ATTRIBUTE]: `month-${month}` }}
                        />
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      </section>
      <PrintYear
        title={periodJournal(data.journals, options.from, options.to)?.title ?? null}
        months={exportMonths(options.from, options.to)}
        sessions={data.sessions}
        customTypes={data.customTypes}
        from={options.from}
        to={options.to}
        today={today}
      />

      {withStats && (
        <>
          <ChapterPage id="chapter-stats" title={tArcher('stats')} />
          {options.rankings.length > 0 && (
            <PrintRankings list={data.rankings} disciplines={options.rankings} />
          )}
          {options.indicators.length > 0 && (
            <PrintStats
              stats={data.stats}
              indicators={options.indicators}
              from={options.from}
              to={options.to}
              today={today}
            />
          )}
        </>
      )}

      <ChapterPage id="chapter-journal" title={tArcher('journal')} />
      {exportMonths(options.from, options.to).map((month) => (
        <Fragment key={month}>
          <PrintMonth
            month={month}
            {...monthDecoration(data.journals, month)}
            stars={monthStars(data.journals, month)}
            sessions={data.sessions.filter((s) => s.date.startsWith(month))}
            from={options.from}
            to={options.to}
          />
          {/* The month's sheets, by day. */}
          {data.sheets
            .filter(({ session }) => session.date.startsWith(month))
            .toSorted((a, b) => a.session.date.localeCompare(b.session.date))
            .map(({ session, photos }) => (
              <Fragment key={session.id}>
                <PrintSheet session={session} />
                <PrintPhotos session={session} photos={photos} />
              </Fragment>
            ))}
        </Fragment>
      ))}

      {/*
        The Sheets section's binder (not the events' sheets above): each part that has sheets
        from a new page, its sheets one after the other, oldest first.
      */}
      <ChapterPage id="chapter-sheets" title={tArcher('sheets')}>
        <p>{tArcher('sheetsIntro')}</p>
        {data.binder.length === 0 && <p className={classes.muted}>{tSheets('noneCoach')}</p>}
      </ChapterPage>
      {SHEET_CATEGORIES.map(({ id }) => {
        const inPart = data.binder.filter((sheet) => sheet.category === id);
        if (inPart.length === 0) return null;
        return (
          <section key={id} className={`${classes.page} ${classes.sheet}`}>
            <h2 className={classes.heading}>
              <span className={classes.highlight}>{tSheets(`categories.${id}.name`)}</span>
            </h2>
            {inPart.map((sheet) => (
              <article key={sheet.id} className={classes.binderSheet}>
                <h3 className={classes.subheading}>{sheet.title}</h3>
                <p className={`${classes.binderDate} ${classes.plainFont}`}>
                  {tSheets('updated', { date: day(sheet.updatedAt.slice(0, 10)) })}
                </p>
                {/* A strength sheet's programme, then its notes. */}
                {sheet.strengthSteps.length > 0 && (
                  <ol className={classes.binderProgramme}>
                    {sheet.strengthSteps.map((step, i) => (
                      <li key={i}>
                        <strong>{step.name}</strong> —{' '}
                        {[
                          volumeLabel(step),
                          step.load === 'KG'
                            ? tStrength('kg', { kg: step.loadKg ?? 0 })
                            : tStrength(`loads.${step.load}`),
                          step.restSeconds !== null &&
                            tStrength('restShort', { rest: durationLabel(step.restSeconds) }),
                          step.note,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </li>
                    ))}
                  </ol>
                )}
                <p className={classes.binderText}>{sheet.body}</p>
                {/* A technique sheet's photos, when the photos were asked for. */}
                {(data.binderPhotos[sheet.id]?.length ?? 0) > 0 && (
                  <div className={classes.binderPhotos}>
                    {data.binderPhotos[sheet.id]!.map((photo) => (
                      // Signed storage links, printed as they are.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={photo.id} src={photo.url} alt="" />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        );
      })}
      {/*
        The very end: the season summary of the extract's days, as the Indicators page's
        whiteboard, landscape (with the Indicators chapter's figures).
      */}
      {data.stats && (
        <PrintSeason
          summary={seasonSummary(data.stats, data.goals, options.from, options.to)}
          journal={{
            title: periodJournal(data.journals, options.from, options.to)?.title ?? '',
            startDate: options.from,
            endDate: options.to,
          }}
        />
      )}
      {/* Sheets paired, months on facing pages: before printing. */}
      <Paginate />
      <PrintReady />
    </main>
  );
}

/**
 * A chapter's title page: its name in the middle of the page, and a few words under it. On a
 * right-hand page: the blank page before it is shown when needed (lib/pdf.ts).
 */
function ChapterPage({
  id,
  title,
  children,
}: {
  /** What the index links to. */
  id: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <>
      <div className={classes.blankPage} {...{ [BLANK_ATTRIBUTE]: '' }} />
      <section
        id={id}
        className={`${classes.page} ${classes.chapter}`}
        {...{ [CHAPTER_ATTRIBUTE]: '' }}
      >
        <h2 className={classes.chapterTitle}>{title}</h2>
        {children && <div className={classes.chapterNote}>{children}</div>}
      </section>
    </>
  );
}

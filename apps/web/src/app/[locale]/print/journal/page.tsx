import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Fragment, type ReactNode } from 'react';
import { Paginate } from '@/components/print/paginate';
import { PrintMonth } from '@/components/print/print-month';
import { PrintRankings, PrintStats } from '@/components/print/print-parts';
import { PrintReady } from '@/components/print/print-ready';
import { PrintPhotos, PrintSheet } from '@/components/print/print-sheet';
import classes from '@/components/print/print.module.css';
import type { Locale } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/current-user';
import { getExportData, monthDecoration } from '@/lib/export-data';
import { exportMonths, parseExportOptions } from '@/lib/export-options';

/**
 * The journal's PDF extract, as Chromium prints it (archer/export/route.ts): a cover, then
 * chapters, each opened by a title page: Indicators (the national rankings and the
 * indicators, if asked for), Journal (each month's calendar, followed by that month's sheets
 * by day if asked for, each with its photos), Sheets (the Sheets section's technique and
 * settings sheets, coming soon). A5, plain paper: no header, tabs or notebook (app-shell).
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
  const format = await getFormatter();
  const data = await getExportData(options);
  const today = new Date().toISOString().slice(0, 10);
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00Z`), { dateStyle: 'long', timeZone: 'UTC' });

  return (
    <main className={classes.document}>
      <section className={classes.cover}>
        <h1 className={classes.coverTitle}>{t('coverTitle')}</h1>
        <div className={classes.coverName}>{user.displayName ?? user.email}</div>
        <div>{t('period', { from: day(options.from), to: day(options.to) })}</div>
        <div className={classes.muted}>{t('generatedOn', { date: day(today) })}</div>
      </section>

      {(options.rankings.length > 0 || options.indicators.length > 0) && (
        <>
          <ChapterPage title={tArcher('stats')} />
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

      <ChapterPage title={tArcher('journal')} />
      {exportMonths(options.from, options.to).map((month) => (
        <Fragment key={month}>
          <PrintMonth
            month={month}
            {...monthDecoration(data.journals, month)}
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
        The Sheets section (technique and settings sheets, not the events' sheets above):
        empty on the site for now, so its title page only. Its sheets will follow it.
      */}
      <ChapterPage title={tArcher('sheets')}>
        <p>{tArcher('sheetsIntro')}</p>
        <p className={classes.muted}>{tArcher('comingSoon')}</p>
      </ChapterPage>
      {/* Sheets paired, months on facing pages: before printing. */}
      <Paginate />
      <PrintReady />
    </main>
  );
}

/** A chapter's title page: its name in the middle of the page, and a few words under it. */
function ChapterPage({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className={`${classes.page} ${classes.chapter}`}>
      <h2 className={classes.chapterTitle}>{title}</h2>
      {children && <div className={classes.chapterNote}>{children}</div>}
    </section>
  );
}

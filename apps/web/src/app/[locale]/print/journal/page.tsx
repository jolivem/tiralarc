import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Fragment } from 'react';
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
 * The journal's PDF extract, as Chromium prints it (archer/export/route.ts): a cover, the
 * national rankings and the indicators if asked for, then each month's calendar followed by
 * its sheets (and their photos). A5, plain paper: no header, tabs or notebook (app-shell).
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

      {options.rankings && <PrintRankings list={data.rankings} />}
      {options.stats && (
        <PrintStats stats={data.stats} from={options.from} to={options.to} today={today} />
      )}

      {exportMonths(options.from, options.to).map((month) => {
        const sessions = data.sessions.filter((s) => s.date.startsWith(month));
        return (
          <Fragment key={month}>
            <PrintMonth
              month={month}
              {...monthDecoration(data.journals, month)}
              sessions={sessions}
              from={options.from}
              to={options.to}
            />
            {data.sheets
              .filter(({ session }) => session.date.startsWith(month))
              .map(({ session, photos }) => (
                <Fragment key={session.id}>
                  <PrintSheet session={session} />
                  <PrintPhotos session={session} photos={photos} />
                </Fragment>
              ))}
          </Fragment>
        );
      })}
      <PrintReady />
    </main>
  );
}

import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/schedule/styles.css';
import '../globals.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata } from 'next';
import {
  Caveat,
  Courgette,
  Dancing_Script,
  Geist,
  Geist_Mono,
  Great_Vibes,
  Kaushan_Script,
  Patrick_Hand,
  Ribeye,
  Satisfy,
} from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { type CSSProperties, Suspense } from 'react';
import { TiralarcShell } from '@/components/app-shell';
import { Providers } from '@/components/providers';
import { routing } from '@/i18n/routing';
import { getArcherProfile } from '@/lib/archer-profile';
import { calendarFont, calendarFontFamily } from '@/lib/calendar-fonts';
import { getAthletes } from '@/lib/coaching';
import { getActiveProfile, getCurrentUser } from '@/lib/current-user';
import { getJournals, getSelectedJournal } from '@/lib/journals';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
/** Handwriting, for the notebook's titles (components/notebook). */
const caveat = Caveat({ variable: '--font-hand', subsets: ['latin'] });
/** Upright handwriting (Caveat has none), for the notebook's calendars. */
const patrickHand = Patrick_Hand({
  variable: '--font-hand-upright',
  subsets: ['latin'],
  weight: '400',
});
/** The Journal's month name, drawn hollow and coloured in by the archer (journal/month-title.tsx). */
const ribeye = Ribeye({
  variable: '--font-month',
  subsets: ['latin', 'latin-ext'],
  weight: '400',
});
/*
 * The calendars' calligraphy fonts (lib/calendar-fonts.ts): the archer picks one on the
 * Profile page. Not preloaded: only the chosen one is downloaded, when a calendar shows.
 * (next/font wants each loader call assigned to its own module-level const.)
 */
const dancingScript = Dancing_Script({
  variable: '--font-cal-dancing-script',
  subsets: ['latin'],
  preload: false,
});
const satisfy = Satisfy({
  variable: '--font-cal-satisfy',
  subsets: ['latin'],
  weight: '400',
  preload: false,
});
const courgette = Courgette({
  variable: '--font-cal-courgette',
  subsets: ['latin'],
  weight: '400',
  preload: false,
});
const kaushanScript = Kaushan_Script({
  variable: '--font-cal-kaushan-script',
  subsets: ['latin'],
  weight: '400',
  preload: false,
});
const greatVibes = Great_Vibes({
  variable: '--font-cal-great-vibes',
  subsets: ['latin'],
  weight: '400',
  preload: false,
});
const calendarFonts = [dancingScript, satisfy, courgette, kaushanScript, greatVibes];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'fr' | 'en', namespace: 'home' });
  return { title: 'MyArcheryDiary', description: t('tagline') };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Drives the navigation only; pages and the archer layout enforce access themselves.
  const [user, profile] = await Promise.all([getCurrentUser(), getActiveProfile()]);
  // The journals named in the middle of the header (the archer's own, the ones of the archers
  // they coach), and the font of their calendars, on <html> so dialogs (portals) get it too.
  const isArcher = user?.roles.includes('ARCHER') ?? false;
  const [ownJournals, selected, athletes, archerProfile] = await Promise.all([
    isArcher ? getJournals() : [],
    isArcher ? getSelectedJournal() : null,
    user?.roles.includes('COACH') ? getAthletes() : [],
    isArcher ? getArcherProfile() : null,
  ]);
  const fontStyle = {
    '--font-calendar': calendarFontFamily(calendarFont(archerProfile?.calendarFont)),
  } as CSSProperties;
  const shellUser = user && {
    displayName: user.displayName,
    email: user.email,
    roles: user.roles,
    profile,
    journals: {
      own: ownJournals.map(({ id, title }) => ({ id, title })),
      athletes: athletes.map(({ id, name, journal }) => ({
        id,
        name,
        journalTitle: journal?.title ?? null,
      })),
      selectedId: selected?.id ?? null,
    },
  };

  return (
    <html
      lang={locale}
      className={[geistSans, geistMono, caveat, patrickHand, ribeye, ...calendarFonts]
        .map((font) => font.variable)
        .join(' ')}
      style={fontStyle}
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <NextIntlClientProvider>
          <Providers locale={locale}>
            <Suspense>
              <TiralarcShell user={shellUser}>{children}</TiralarcShell>
            </Suspense>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

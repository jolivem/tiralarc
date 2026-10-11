import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/schedule/styles.css';
import '../globals.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata } from 'next';
import { Caveat, Geist, Geist_Mono, Patrick_Hand } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { TiralarcShell } from '@/components/app-shell';
import { Providers } from '@/components/providers';
import { routing } from '@/i18n/routing';
import { getActiveProfile, getCurrentUser } from '@/lib/current-user';
import { getSelectedJournal } from '@/lib/journals';

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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'fr' | 'en', namespace: 'home' });
  return { title: 'Tiralarc', description: t('tagline') };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Drives the navigation only; pages and the archer layout enforce access themselves.
  const [user, profile] = await Promise.all([getCurrentUser(), getActiveProfile()]);
  // The journal the archer works in, named in the middle of the header.
  const journal = profile === 'ARCHER' ? await getSelectedJournal() : null;
  const shellUser = user && {
    displayName: user.displayName,
    email: user.email,
    roles: user.roles,
    profile,
    journalTitle: journal?.title ?? null,
  };

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${patrickHand.variable}`}
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

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '../globals.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { TiralarcShell } from '@/components/app-shell';
import { Providers } from '@/components/providers';
import { routing } from '@/i18n/routing';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

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

  // Only drives which menu entries are shown; pages check the session themselves.
  const cookieStore = await cookies();
  const signedIn = cookieStore.has(ACCESS_COOKIE) || cookieStore.has(REFRESH_COOKIE);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <NextIntlClientProvider>
          <Providers locale={locale}>
            <Suspense>
              <TiralarcShell signedIn={signedIn}>{children}</TiralarcShell>
            </Suspense>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

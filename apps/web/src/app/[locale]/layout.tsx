import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'home' });
  return { title: 'Tiralarc', description: t('tagline') };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
            <Link href="/" className="font-semibold">
              Tiralarc
            </Link>
            <Suspense>
              <LanguageSwitcher />
            </Suspense>
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

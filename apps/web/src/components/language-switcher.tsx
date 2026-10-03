'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const current = useLocale();
  const pathname = usePathname();
  const query = Object.fromEntries(useSearchParams());

  return (
    <nav aria-label={t('language')} className="flex gap-2 text-sm">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={{ pathname, query }}
          locale={locale}
          aria-current={locale === current ? 'true' : undefined}
          className={locale === current ? 'font-semibold' : 'text-neutral-500 underline'}
        >
          {t(`locales.${locale}`)}
        </Link>
      ))}
    </nav>
  );
}

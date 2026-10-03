'use client';

import { SegmentedControl } from '@mantine/core';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';

/** FR / EN switch that keeps the current page and query string. */
export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <SegmentedControl
      size="xs"
      aria-label={t('language')}
      value={locale}
      disabled={pending}
      data={routing.locales.map((value) => ({
        value,
        label: value.toUpperCase(),
      }))}
      onChange={(next) =>
        startTransition(() =>
          router.replace(
            { pathname, query: Object.fromEntries(searchParams) },
            { locale: next as Locale },
          ),
        )
      }
    />
  );
}

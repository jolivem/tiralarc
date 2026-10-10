'use client';

import { Select } from '@mantine/core';
import type { Journal } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ALL_TIME } from './chart-utils';

/** Chooses what the indicators cover: everything, or the period of one journal. */
export function PeriodSelect({ journals, value }: { journals: Journal[]; value: string }) {
  const t = useTranslations('stats');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      aria-label={t('period')}
      w={{ base: '100%', xs: 260 }}
      data={[
        { value: ALL_TIME, label: t('allTime') },
        ...journals.map((journal) => ({ value: journal.id, label: journal.title })),
      ]}
      value={value}
      allowDeselect={false}
      disabled={pending}
      onChange={(period) =>
        period &&
        startTransition(() => router.replace({ pathname: '/archer/stats', query: { period } }))
      }
    />
  );
}

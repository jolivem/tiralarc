import { Stack, Text } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import binder from '@/components/binder/binder.module.css';
import { HandHeading } from '@/components/notebook/notebook';
import { SheetBinder } from '@/components/sheets/sheet-binder';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';

/** The archer's binder as their coach reads it (any access): no "+", sheets read-only. */
export default async function CoachSheetsPage({
  params,
}: PageProps<'/[locale]/coach/[archerId]/sheets'>) {
  const { locale, archerId } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');
  const tSheets = await getTranslations('sheets');
  const { data: sheets } = await (
    await getAuthedApi()
  ).GET('/api/v1/coach/athletes/{archerId}/sheets', { params: { path: { archerId } } });

  return (
    <>
      <Stack gap={4} className={binder.header}>
        <HandHeading order={1}>{t('sheets')}</HandHeading>
        <Text c="dimmed" maw={640}>
          {tSheets('coachIntro')}
        </Text>
      </Stack>
      <SheetBinder sheets={sheets ?? []} archerId={archerId} />
    </>
  );
}

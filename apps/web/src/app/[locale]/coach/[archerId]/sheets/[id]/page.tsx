import { Stack } from '@mantine/core';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { PHOTO_CATEGORIES } from '@/components/sheets/categories';
import { SheetForm } from '@/components/sheets/sheet-form';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';

/** One sheet of the archer's binder, as their coach reads it (a technique sheet's photos too). */
export default async function CoachSheetPage({
  params,
}: PageProps<'/[locale]/coach/[archerId]/sheets/[id]'>) {
  const { locale, archerId, id } = await params;
  setRequestLocale(locale as Locale);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const api = await getAuthedApi();
  const path = { archerId, id };
  const { data: sheet } = await api.GET('/api/v1/coach/athletes/{archerId}/sheets/{id}', {
    params: { path },
  });
  if (!sheet) notFound();
  const photos = PHOTO_CATEGORIES.includes(sheet.category)
    ? ((await api.GET('/api/v1/coach/athletes/{archerId}/sheets/{id}/photos', { params: { path } }))
        .data ?? [])
    : undefined;

  return (
    <Stack gap="sm" maw={960} mx="auto" w="100%">
      <SheetForm sheet={sheet} photos={photos} archerId={archerId} />
    </Stack>
  );
}

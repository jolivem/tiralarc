import { Stack } from '@mantine/core';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { PHOTO_CATEGORIES } from '@/components/sheets/categories';
import { SheetForm } from '@/components/sheets/sheet-form';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';

/** One sheet of the archer's binder, on its own loose leaf (a technique sheet with its photos). */
export default async function ArcherSheetPage({
  params,
}: PageProps<'/[locale]/archer/sheets/[id]'>) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const api = await getAuthedApi();
  const { data: sheet } = await api.GET('/api/v1/sheets/{id}', { params: { path: { id } } });
  if (!sheet) notFound();
  const photos = PHOTO_CATEGORIES.includes(sheet.category)
    ? ((await api.GET('/api/v1/sheets/{sheetId}/photos', { params: { path: { sheetId: id } } }))
        .data ?? [])
    : undefined;

  return (
    <Stack gap="sm" maw={960} mx="auto" w="100%">
      <SheetForm sheet={sheet} photos={photos} />
    </Stack>
  );
}

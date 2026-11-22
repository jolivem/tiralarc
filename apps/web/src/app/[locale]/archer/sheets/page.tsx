import { Stack, Text } from '@mantine/core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import binder from '@/components/binder/binder.module.css';
import { HandHeading } from '@/components/notebook/notebook';
import { SheetBinder } from '@/components/sheets/sheet-binder';
import { Tour } from '@/components/tour/tour';
import type { Locale } from '@/i18n/routing';
import { getAuthedApi } from '@/lib/api';
import { getArcherProfile } from '@/lib/archer-profile';
import { getJournals } from '@/lib/journals';

/**
 * The Sheets page's guided tour: a welcome, the binder, its "+" (templates), then each of the
 * four parts (`data-tour` = the category in lower case, sheet-binder.tsx).
 */
const SHEETS_TOUR = [
  'welcome',
  'binder',
  'add',
  'technique',
  'settings',
  'strength',
  'mental',
] as const;

/** The Sheets section: the archer's binder, its four parts each opening on their index. */
export default async function ArcherSheetsPage({ params }: PageProps<'/[locale]/archer/sheets'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('archer');
  const tTour = await getTranslations('tours.sheets');
  const api = await getAuthedApi();
  const [{ data: sheets }, { data: templates }, profile, journals] = await Promise.all([
    api.GET('/api/v1/sheets'),
    // Offered by "+", in the site's language.
    api.GET('/api/v1/sheets/templates', { params: { query: { locale } } }),
    getArcherProfile(),
    getJournals(),
  ]);

  return (
    <>
      <Stack gap={4} className={binder.header}>
        <HandHeading order={1}>{t('sheets')}</HandHeading>
        <Text c="dimmed" maw={640}>
          {t('sheetsIntro')}
        </Text>
      </Stack>
      <SheetBinder sheets={sheets ?? []} templates={templates ?? []} />
      {/* The first time only (then from the header's "?"). */}
      <Tour
        id="sheets"
        autoStart={journals.length > 0 && !(profile?.toursSeen ?? []).includes('sheets')}
        steps={SHEETS_TOUR.map((key) => ({
          target: key === 'welcome' ? undefined : key,
          title: tTour(`${key}.title`),
          body: tTour(`${key}.body`),
        }))}
      />
    </>
  );
}

import type { Discipline } from '@tiralarc/api-client';
import { getTranslations } from 'next-intl/server';
import { RuledActionCard } from '@/components/notebook/ruled-action-card';
import { ExportButton } from './export-button';

/**
 * Home page, left page: the PDF extract, written on the notebook's lines: its title, what
 * it is for, and on its right the button opening the export dialog.
 */
export async function ExportCard(props: { from: string; to: string; disciplines: Discipline[] }) {
  const t = await getTranslations('export');
  return (
    <RuledActionCard
      title={t('title')}
      intro={t('cardIntro')}
      action={<ExportButton {...props} />}
    />
  );
}

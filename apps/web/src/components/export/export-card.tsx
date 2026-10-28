import type { Discipline } from '@tiralarc/api-client';
import { getTranslations } from 'next-intl/server';
import { RuledHeading } from '@/components/notebook/on-ruling';
import { RuledStack } from '@/components/notebook/ruled-stack';
import { ExportButton } from './export-button';
import classes from './export.module.css';

/**
 * Home page, left page: the PDF extract, written on the notebook's lines: its title, what
 * it is for, and on its right the button opening the export dialog.
 */
export async function ExportCard(props: { from: string; to: string; disciplines: Discipline[] }) {
  const t = await getTranslations('export');
  return (
    <section>
      <RuledStack>
        <RuledHeading>{t('title')}</RuledHeading>
        <div className={classes.row}>
          <p className={classes.intro}>{t('cardIntro')}</p>
          <div className={classes.action}>
            <ExportButton {...props} />
          </div>
        </div>
      </RuledStack>
    </section>
  );
}

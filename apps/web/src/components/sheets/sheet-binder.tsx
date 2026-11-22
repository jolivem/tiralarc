import type { SheetSummary, SheetTemplate } from '@tiralarc/api-client';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { SHEET_CATEGORIES, sheetsPath } from './categories';
import { NewSheetButton } from './new-sheet-button';
import classes from './sheets.module.css';

/**
 * The Sheets section: a ring binder holding four independent half-pages — technique,
 * settings, strength, mental preparation —, each on its own pastel paper, opening on the index
 * of its sheets (numbered titles; their dates are on the sheets) with "+" to add one. A sheet
 * opens on its own page. With `archerId`, the binder as the archer's coach reads it: no "+".
 */
export async function SheetBinder({
  sheets,
  templates = [],
  archerId,
}: {
  sheets: SheetSummary[];
  /** Ready-made sheets "+" offers to start from, each in its category. */
  templates?: SheetTemplate[];
  archerId?: string;
}) {
  const t = await getTranslations('sheets');

  return (
    <div className={classes.binder} role="group" aria-label={t('binder')} data-tour="binder">
      {SHEET_CATEGORIES.map(({ id, icon: Icon }, i) => {
        const name = t(`categories.${id}.name`);
        const inPart = sheets.filter((sheet) => sheet.category === id);
        const side = i % 2 === 0 ? 'left' : 'right';
        return (
          <section
            key={id}
            className={classes.part}
            data-category={id}
            data-side={side}
            // The guided tour's step for this part (SHEETS_TOUR).
            data-tour={id.toLowerCase()}
            aria-labelledby={`sheets-${id}`}
          >
            {/* Two holes a page; the left page of a row draws the row's two rings. */}
            {['25%', '75%'].map((top) => (
              <span key={top} aria-hidden>
                <span className={classes.hole} style={{ top }} />
                {side === 'left' && <span className={classes.ring} style={{ top }} />}
              </span>
            ))}
            <div className={classes.partHeader}>
              <h2 id={`sheets-${id}`} className={classes.partTitle}>
                <Icon size={26} stroke={1.8} />
                {name}
              </h2>
              {!archerId && (
                <NewSheetButton
                  // The tour shows the first part's "+" for all four.
                  tour={i === 0 ? 'add' : undefined}
                  category={id}
                  name={name}
                  templates={templates.filter((template) => template.category === id)}
                />
              )}
            </div>
            <p className={classes.partIntro}>{t(`categories.${id}.intro`)}</p>
            {inPart.length > 0 && (
              <ol className={classes.index}>
                {inPart.map((sheet) => (
                  <li key={sheet.id} className={classes.indexItem}>
                    <Link
                      href={`${sheetsPath(archerId)}/${sheet.id}`}
                      className={classes.indexLink}
                    >
                      <span className={classes.indexTitle}>{sheet.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}

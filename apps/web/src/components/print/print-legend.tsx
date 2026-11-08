'use client';

import type { CustomEventType } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useLegendRows } from '@/components/journal/event-legend';
import { FEELINGS } from '@/components/journal/feelings';
import classes from './print.module.css';

/**
 * What the extract's signs mean, after its cover: each event type's colour (the year calendar's
 * dots) and symbol (the month calendars'), then the feelings' faces (the sheets').
 */
export function PrintLegend({ customTypes }: { customTypes: CustomEventType[] }) {
  const t = useTranslations('journal');
  const rows = useLegendRows(customTypes);

  return (
    <section className={classes.page}>
      <h2 className={classes.heading}>
        <span className={classes.highlight}>{t('legend')}</span>
      </h2>
      <div className={classes.legendFrame}>
        <ul className={classes.legendTypes}>
          {rows.map(({ key, color, icon: Icon, label }) => (
            <li key={key} className={classes.legendType}>
              <i style={{ background: `var(--mantine-color-${color}-filled)` }} />
              <span>{label}</span>
              <Icon size={34} color={`var(--mantine-color-${color}-filled)`} />
            </li>
          ))}
        </ul>
        <div className={classes.legendFaces}>
          {FEELINGS.map(({ value, src, color }) => (
            <figure key={value} className={classes.legendFace}>
              <span style={{ background: color }}>
                {/* Decorative, small and static: a plain <img> rather than next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
              </span>
              <figcaption>{t(`feelings.${value}`)}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

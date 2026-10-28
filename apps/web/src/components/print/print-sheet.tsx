'use client';

import { Badge } from '@mantine/core';
import type { Feeling, JournalSession, SessionPhoto } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { EventIcon } from '@/components/journal/event-display';
import { FEELING_INK, FEELINGS } from '@/components/journal/feelings';
import { DISCIPLINE_COLORS } from '@/components/journal/session-types';
import { SHEET_ATTRIBUTE } from './markers';
import classes from './print.module.css';

/** A rating's colour, as on the sheet: red up to 3, orange up to 6, green from 7. */
const ratingColor = (value: number) =>
  `var(--mantine-color-${value <= 3 ? 'red' : value < 7 ? 'orange' : 'green'}-filled)`;

/** A box of the sheet, left out when empty. */
function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={classes.box}>
      <h3 className={classes.boxTitle}>{title}</h3>
      {children}
    </section>
  );
}

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div>
        {label} : <strong>{value} / 10</strong>
      </div>
      <div className={classes.rating} aria-hidden>
        <div className={classes.ratingTrack}>
          <div
            className={classes.ratingBar}
            style={{ width: `${value * 10}%`, background: ratingColor(value) }}
          />
        </div>
      </div>
    </div>
  );
}

function FeelingFace({ label, value }: { label: string; value: Feeling }) {
  const t = useTranslations('journal.feelings');
  const feeling = FEELINGS.find((f) => f.value === value);
  if (!feeling) return null;
  const Icon = feeling.icon;
  return (
    <Box title={label}>
      <div className={classes.feeling}>
        <span className={classes.face} style={{ background: feeling.color }}>
          <Icon size={26} color={FEELING_INK} />
        </span>
        {t(value)}
      </div>
    </Box>
  );
}

/**
 * One training, coaching or competition sheet, on a page of its own (or sharing it with the
 * next one when both fit: paginate.tsx): what the archer wrote on it, the empty boxes
 * left out. A sheet still to review says so.
 */
export function PrintSheet({ session: s }: { session: JournalSession }) {
  const t = useTranslations();
  const format = useFormatter();
  const number = (value: number) => format.number(value);

  const fields: [string, ReactNode][] = [];
  if (s.durationMinutes !== null) fields.push([t('journal.duration'), number(s.durationMinutes)]);
  if (s.location) fields.push([t('journal.location'), s.location]);
  if (s.discipline) {
    fields.push([
      t('journal.discipline'),
      <Badge key="discipline" variant="light" color={DISCIPLINE_COLORS[s.discipline]} size="sm">
        {t(`journal.disciplines.${s.discipline}`)}
      </Badge>,
    ]);
  }
  if (s.distanceMeters !== null) fields.push([t('journal.distance'), number(s.distanceMeters)]);
  if (s.arrowCount !== null) fields.push([t('journal.arrows'), number(s.arrowCount)]);
  if (s.score !== null) fields.push([t('journal.score'), number(s.score)]);

  const wentWell = s.wentWell.filter((line) => line.trim());
  const toImprove = s.toImprove.filter((line) => line.trim());
  const lists = (
    [
      ['wentWell', wentWell],
      ['toImprove', toImprove],
    ] as const
  ).filter(([, lines]) => lines.length > 0);
  const feelings = (
    [
      ['physical', s.physicalFeeling],
      ['mental', s.mentalFeeling],
    ] as const
  ).flatMap(([kind, value]) => (value ? [{ kind, value }] : []));

  return (
    <section className={`${classes.page} ${classes.sheet}`} {...{ [SHEET_ATTRIBUTE]: '' }}>
      <header className={classes.sheetHeader}>
        <EventIcon session={s} size={36} />
        <h2 className={classes.sheetType}>{t(`journal.types.${s.type}`)}</h2>
        <div className={classes.sheetDate}>
          <strong>
            {format.dateTime(new Date(`${s.date}T12:00:00Z`), {
              dateStyle: 'full',
              timeZone: 'UTC',
            })}
          </strong>
          {s.plannedBy && (
            <div className={classes.muted}>
              {t('journal.plannedBy', { name: s.plannedBy.name })}
            </div>
          )}
        </div>
      </header>

      {fields.length > 0 && (
        <Box title={t('journal.info')}>
          <dl className={classes.fields}>
            {fields.map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Box>
      )}
      {s.objective && (
        <Box title={t('journal.objective')}>
          <p className={classes.text}>{s.objective}</p>
        </Box>
      )}
      {!s.completed && <p className={`${classes.box} ${classes.muted}`}>{t('export.noReview')}</p>}
      {(s.satisfaction !== null || s.technique !== null) && (
        <Box title={t('journal.selfAssessment')}>
          <div className={classes.twoColumns}>
            {s.satisfaction !== null && (
              <Rating label={t('journal.satisfaction')} value={s.satisfaction} />
            )}
            {s.technique !== null && <Rating label={t('journal.technique')} value={s.technique} />}
          </div>
        </Box>
      )}
      {s.description && (
        <Box title={t('journal.description')}>
          <p className={classes.text}>{s.description}</p>
        </Box>
      )}
      {feelings.length > 0 && (
        <div className={classes.twoColumns}>
          {feelings.map(({ kind, value }) => (
            <FeelingFace key={kind} label={t(`journal.${kind}`)} value={value} />
          ))}
        </div>
      )}
      {lists.length > 0 && (
        <div className={classes.twoColumns}>
          {lists.map(([list, lines]) => (
            <Box key={list} title={t(`journal.${list}`)}>
              <ul className={classes.list}>
                {lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </Box>
          ))}
        </div>
      )}
      {s.nextTime && (
        <Box title={t('journal.nextTime')}>
          <p className={classes.text}>{s.nextTime}</p>
        </Box>
      )}
    </section>
  );
}

/** Columns of the photos' grid: one picture alone, then two side by side, then three. */
const columnsFor = (count: number) => (count === 1 ? 1 : count <= 4 ? 2 : 3);

/**
 * An event's photos, together on the page after its sheet: full size when one or two share
 * the page, their thumbnails beyond (smaller on paper, and a lighter file).
 */
export function PrintPhotos({
  session,
  photos,
}: {
  session: JournalSession;
  photos: SessionPhoto[];
}) {
  const t = useTranslations();
  const format = useFormatter();
  if (photos.length === 0) return null;
  const columns = columnsFor(photos.length);
  return (
    <section className={`${classes.page} ${classes.photosPage}`}>
      <h2 className={classes.subheading} style={{ marginTop: 0 }}>
        {t('export.photosOf', {
          type: t(`journal.types.${session.type}`),
          date: format.dateTime(new Date(`${session.date}T12:00:00Z`), {
            dateStyle: 'long',
            timeZone: 'UTC',
          }),
        })}
      </h2>
      <div className={classes.photos} style={{ '--photo-columns': columns } as CSSProperties}>
        {photos.map((photo) => (
          // Signed URLs of the photo storage, printed as they are.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.id}
            src={photos.length <= 2 ? photo.url : photo.thumbnailUrl}
            alt=""
            className={classes.photo}
          />
        ))}
      </div>
    </section>
  );
}

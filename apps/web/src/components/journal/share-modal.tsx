'use client';

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  UnstyledButton,
} from '@mantine/core';
import {
  IconBrandInstagram,
  IconCheck,
  IconCopy,
  IconDownload,
  IconShare,
} from '@tabler/icons-react';
import type { Feeling, JournalSession, SessionPhoto } from '@tiralarc/api-client';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FEELINGS } from './feelings';
import classes from './journal.module.css';
import { TYPE_PICTURES } from './session-types';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  DEFAULT_SHARE_FIELDS,
  drawCard,
  filledRows,
  type ShareField,
  type ShareRow,
} from './share-card';

/** Instagram's carousel takes 10 pictures: the card, then 9 photos at most. */
const MAX_SHARED_PHOTOS = 9;
const JPEG_QUALITY = 0.92;
/** The types whose sheets are shared (session-form.tsx). */
type SharedType = 'TRAINING' | 'COACHING' | 'COMPETITION';

type Status = 'idle' | 'shared' | 'downloaded' | 'copied' | 'error';

const toJpeg = (canvas: HTMLCanvasElement, name: string) =>
  new Promise<File>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], name, { type: 'image/jpeg' })) : reject()),
      'image/jpeg',
      JPEG_QUALITY,
    ),
  );

/** A photo as JPEG (stored as WebP, which Instagram may refuse), read through the web server. */
async function photoFile(url: string, name: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(String(response.status));
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = Object.assign(document.createElement('canvas'), {
    width: bitmap.width,
    height: bitmap.height,
  });
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return toJpeg(canvas, name);
}

/** The card's drawings (public/icons/…), each loaded once; null if it can't be. */
const images = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(src: string) {
  let image = images.get(src);
  if (!image) {
    const element = new Image();
    element.src = src;
    image = element.decode().then(
      () => element,
      () => null,
    );
    images.set(src, image);
  }
  return image;
}

/** The feelings' faces on their pastels (a missing one: its name is written). */
const feelingFaces = async () => {
  const entries = await Promise.all(
    FEELINGS.map(async ({ value, src, color }) => {
      const image = await loadImage(src);
      return image ? [[value, { image, color }] as const] : [];
    }),
  );
  return Object.fromEntries(entries.flat()) as Partial<
    Record<Feeling, { image: HTMLImageElement; color: string }>
  >;
};

function download(file: File) {
  const url = URL.createObjectURL(file);
  Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * "Share" on the sheet of a training, coaching or competition that has taken place: a summary
 * for Instagram. The archer ticks the fields (a card drawn like the sheet, share-card.ts) and
 * the photos that follow it, and edits the caption. No Instagram API (business accounts
 * only): the phone's share sheet (Web Share API) hands the pictures to the Instagram app, the
 * caption copied meanwhile (Instagram drops shared text); elsewhere, the pictures are
 * downloaded. `session` holds the sheet as saved.
 */
export function ShareButton({
  session,
  title,
  photos,
  disabled,
}: {
  session: JournalSession;
  /** The event's type (or custom title), the card's heading. */
  title: string;
  photos: SessionPhoto[];
  /** Unsaved changes: the summary would show the sheet as it was. */
  disabled: boolean;
}) {
  const t = useTranslations('journal.share');
  const tJournal = useTranslations('journal');
  const format = useFormatter();
  const locale = useLocale();
  const [opened, setOpened] = useState(false);

  const rows = useMemo(
    () =>
      filledRows(session, {
        label: (field) => t(`labels.${field}`),
        date: (date) =>
          format.dateTime(new Date(`${date}T00:00:00Z`), {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }),
        discipline: (d) => tJournal(`disciplines.${d}`),
        feeling: (f) => tJournal(`feelings.${f}`),
        rating: (value) => t('rating', { value }),
        meters: (value) => t('meters', { value }),
        minutes: (value) => t('minutes', { value }),
      }),
    [session, t, tJournal, format],
  );
  const [fields, setFields] = useState<ShareField[]>(DEFAULT_SHARE_FIELDS);
  const [photoIds, setPhotoIds] = useState(() =>
    photos.slice(0, MAX_SHARED_PHOTOS).map((p) => p.id),
  );
  /** The caption once the archer typed in it; until then it follows the ticked fields. */
  const [edited, setEdited] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  // The day goes under the card's heading; the other ticked fields on its lines. Kept by
  // value, so the card is redrawn only when what it shows changes.
  const chosen = rows.filter((row) => fields.includes(row.field));
  const allChosen = chosen.length === rows.length;
  const shownKey = JSON.stringify({
    date: chosen.find((row) => row.field === 'date')?.text ?? null,
    cardRows: chosen.filter((row) => row.field !== 'date'),
  });
  const { date, cardRows } = useMemo(
    () => JSON.parse(shownKey) as { date: string | null; cardRows: ShareRow[] },
    [shownKey],
  );
  // Only the heading, the website's link (as the archer reaches it; the dialog only renders in
  // the browser) and the hashtags: the fields are on the card.
  const site = typeof window === 'undefined' ? null : window.location;
  const caption =
    edited ??
    [
      date ? `${title} — ${date}` : title,
      '',
      t('siteLink', { url: site?.origin ?? '' }),
      t('hashtags'),
    ].join('\n');

  // The card, redrawn as the fields change: shown in the dialog, then kept as a JPEG. The
  // canvas comes with the dialog's content, once its transition has started.
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  // The type's drawing (trainings, coachings and competitions all have one).
  const picture = TYPE_PICTURES[session.type as SharedType];
  /** The card's JPEG, with what it shows (an older one isn't shared). */
  const [drawn, setDrawn] = useState<{ key: string; file: File } | null>(null);
  const card = drawn?.key === shownKey ? drawn.file : null;
  useEffect(() => {
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let current = true;
    void (async () => {
      // The archer's font (Profile page, set on <html> as --font-calendar; Caveat without
      // one), loaded first (else a fallback font).
      const style = getComputedStyle(document.documentElement);
      const font =
        style.getPropertyValue('--font-calendar').trim() ||
        style.getPropertyValue('--font-hand').trim();
      await document.fonts.load(`700 48px ${font}`).catch(() => undefined);
      await document.fonts.load(`400 48px ${font}`).catch(() => undefined);
      const [faces, logo] = await Promise.all([feelingFaces(), loadImage(picture)]);
      if (!current) return;
      drawCard(ctx, { title, date, rows: cardRows, font, faces, logo, site: window.location.host });
      const file = await toJpeg(canvas, `tiralarc-${session.date}-0.jpg`);
      if (current) setDrawn({ key: shownKey, file });
    })();
    return () => {
      current = false;
    };
  }, [canvas, cardRows, date, shownKey, title, picture, session.date]);

  // The photos as JPEG, prepared once the dialog opens (each once): sharing must follow the
  // click at once.
  const [files, setFiles] = useState<Map<string, File>>(new Map());
  const [photoError, setPhotoError] = useState(false);
  const requested = useRef(new Set<string>());
  useEffect(() => {
    if (!opened) return;
    photos.forEach((photo, i) => {
      if (requested.current.has(photo.id)) return;
      requested.current.add(photo.id);
      photoFile(
        `/${locale}/archer/journal/${session.id}/photos/${photo.id}`,
        `tiralarc-${session.date}-${i + 1}.jpg`,
      ).then(
        (file) => setFiles((map) => new Map(map).set(photo.id, file)),
        () => {
          requested.current.delete(photo.id);
          setPhotoError(true);
        },
      );
    });
  }, [opened, photos, locale, session.id, session.date]);

  const selected = photos.filter((p) => photoIds.includes(p.id));
  const shared = card
    ? [card, ...selected.flatMap((p) => (files.has(p.id) ? [files.get(p.id) as File] : []))]
    : [];
  const ready = card !== null && shared.length === selected.length + 1;
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    ready &&
    navigator.canShare({ files: shared });

  const copy = () => navigator.clipboard?.writeText(caption).catch(() => undefined);

  const share = () => {
    // Both straight from the click (the share sheet needs it): the caption is what Instagram drops.
    void copy();
    navigator.share({ files: shared, text: caption }).then(
      () => setStatus('shared'),
      (error: unknown) =>
        setStatus(error instanceof DOMException && error.name === 'AbortError' ? 'idle' : 'error'),
    );
  };

  const downloadAll = () => {
    void copy();
    shared.forEach(download);
    setStatus('downloaded');
  };

  const toggleField = (field: ShareField) =>
    setFields((list) =>
      list.includes(field) ? list.filter((f) => f !== field) : [...list, field],
    );
  const togglePhoto = (id: string) =>
    setPhotoIds((ids) =>
      ids.includes(id)
        ? ids.filter((i) => i !== id)
        : ids.length < MAX_SHARED_PHOTOS
          ? [...ids, id]
          : ids,
    );

  return (
    <>
      <Button
        variant="subtle"
        leftSection={<IconBrandInstagram size={18} />}
        onClick={() => {
          setStatus('idle');
          setOpened(true);
        }}
        disabled={disabled}
        title={disabled ? t('saveFirst') : t('hint')}
      >
        {t('button')}
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Text fw={600}>{t('title')}</Text>}
        size="xl"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {t('intro')}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <Stack gap="md">
              <Stack gap={6} role="group" aria-label={t('fields')}>
                {/* All the event's fields at once; once they all are, none. */}
                <Group justify="space-between" gap="xs">
                  <Text size="sm" fw={500}>
                    {t('fields')}
                  </Text>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={() => setFields(allChosen ? [] : rows.map((row) => row.field))}
                  >
                    {allChosen ? t('selectNone') : t('selectAll')}
                  </Button>
                </Group>
                {/* The fields' names only (the card shows their values), two columns. */}
                <SimpleGrid cols={2} spacing="xs" verticalSpacing={6}>
                  {rows.map((row) => (
                    <Checkbox
                      key={row.field}
                      label={row.label}
                      checked={fields.includes(row.field)}
                      onChange={() => toggleField(row.field)}
                    />
                  ))}
                </SimpleGrid>
              </Stack>
              <Stack gap={6}>
                <Text size="sm" fw={500}>
                  {t('photos', { count: photoIds.length, max: MAX_SHARED_PHOTOS })}
                </Text>
                {photos.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    {t('noPhotos')}
                  </Text>
                ) : (
                  <SimpleGrid cols={4} spacing="xs">
                    {photos.map((photo, i) => {
                      const on = photoIds.includes(photo.id);
                      return (
                        <UnstyledButton
                          key={photo.id}
                          className={classes.sharePhoto}
                          data-selected={on || undefined}
                          aria-pressed={on}
                          aria-label={t('photo', { n: i + 1 })}
                          onClick={() => togglePhoto(photo.id)}
                        >
                          {/* Signed, short-lived URLs on the storage: not for next/image. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.thumbnailUrl} alt="" />
                          {on && <IconCheck size={18} className={classes.sharePhotoCheck} />}
                        </UnstyledButton>
                      );
                    })}
                  </SimpleGrid>
                )}
              </Stack>
            </Stack>
            <Stack gap="md">
              <canvas
                ref={setCanvas}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                className={classes.shareCard}
                role="img"
                aria-label={t('preview')}
              />
              <Textarea
                label={t('caption')}
                value={caption}
                onChange={(e) => setEdited(e.currentTarget.value)}
                autosize
                minRows={4}
                maxRows={10}
                maxLength={2200}
              />
            </Stack>
          </SimpleGrid>

          {photoError && (
            <Alert color="red" variant="light">
              {t('photoError')}
            </Alert>
          )}
          {status !== 'idle' && (
            <Alert color={status === 'error' ? 'red' : 'teal'} variant="light" role="status">
              {t(`status.${status}`)}
            </Alert>
          )}
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              leftSection={<IconCopy size={18} />}
              onClick={() => copy()?.then(() => setStatus('copied'))}
            >
              {t('copy')}
            </Button>
            <Button
              variant={canShareFiles ? 'default' : 'filled'}
              leftSection={<IconDownload size={18} />}
              onClick={downloadAll}
              disabled={!ready}
            >
              {t('download')}
            </Button>
            {canShareFiles && (
              <Button leftSection={<IconShare size={18} />} onClick={share}>
                {t('share')}
              </Button>
            )}
          </Group>
          {!ready && !photoError && (
            <Text size="xs" c="dimmed" ta="right">
              {t('preparing')}
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}

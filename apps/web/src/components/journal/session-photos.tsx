'use client';

import {
  ActionIcon,
  Button,
  FileButton,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPhoto,
  IconPhotoPlus,
  IconTrash,
} from '@tabler/icons-react';
import type { SessionPhoto } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { use, useRef, useState, useTransition } from 'react';
import { deletePhoto, uploadPhoto } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import { useRouter } from '@/i18n/navigation';
import type { ActionState } from '@/lib/action-state';
import classes from './journal.module.css';
import { SheetLockedContext } from './session-form';

/** Same limits as the API (which enforces them). */
const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;
/** iOS converts HEIC pictures to JPEG when the input only accepts these types. */
const ACCEPT = 'image/jpeg,image/png,image/webp';

/** Blank polaroids peeking out behind the top one: it always looks like a stack. */
const STACKED_BEHIND = 2;

/**
 * Photos of an event, as a stack of polaroids pinned to the sheet: the first photo on top,
 * the next ones peeking out behind it; with none, a greyed polaroid (a click picks photos).
 * The top polaroid opens a viewer to go through them and delete one. Saved right away,
 * independently of the sheet's "Save" button. An event still to come takes no photos yet
 * (greyed; the ones it may already have can still be viewed and deleted).
 */
export function SessionPhotos({
  sessionId,
  photos,
}: {
  sessionId: string;
  photos: SessionPhoto[];
}) {
  const t = useTranslations('journal');
  const router = useRouter();
  const locked = use(SheetLockedContext);
  const [state, setState] = useState<ActionState>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploading, startUploading] = useTransition();
  /** Index of the photo on top of the stack. */
  const [shown, setShown] = useState(0);
  /** Index of the photo shown in the viewer; null = closed. */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDeleting] = useTransition();
  const resetFiles = useRef<() => void>(null);
  const refreshedLinks = useRef(false);

  const opened = openIndex === null ? null : (photos[openIndex] ?? null);
  const remaining = MAX_PHOTOS - photos.length;
  const step = (offset: number) => {
    setConfirmDelete(false);
    setOpenIndex((i) => (i === null ? i : (i + offset + photos.length) % photos.length));
  };

  const upload = (files: File[]) => {
    resetFiles.current?.();
    if (files.length === 0) return;
    setState({});
    startUploading(async () => {
      // One request per photo, so a single failure doesn't lose the others.
      const batch = files.slice(0, remaining);
      for (const [index, file] of batch.entries()) {
        setProgress({ done: index, total: batch.length });
        let result: ActionState;
        if (file.size > MAX_BYTES) result = { code: 'FILE_TOO_LARGE' };
        else {
          const form = new FormData();
          form.set('file', file);
          result = await uploadPhoto(sessionId, form);
        }
        if (result.code) {
          setState(result);
          break;
        }
      }
      setProgress(null);
    });
  };

  const closePhoto = () => {
    setOpenIndex(null);
    setConfirmDelete(false);
  };

  // The photo on top of the stack (the arrows go through them).
  const topIndex = Math.min(shown, Math.max(0, photos.length - 1));
  const first = photos[topIndex];
  const showNext = (offset: number) =>
    setShown((photos.length + topIndex + offset) % photos.length);
  const caption = t('photos.count', { count: photos.length, max: MAX_PHOTOS });

  return (
    // Unframed, like the sheet's other boxes (session-form.tsx): its name on a ruled line.
    <section className={locked ? classes.locked : undefined}>
      {/* No visible title (screen readers still get one): the stack starts at the top. */}
      <h2 className={classes.srOnly}>{t('photos.title')}</h2>
      <Stack gap="xs">
        {/* The stack, pinned at the top: blank polaroids peeking out behind the top one. */}
        <div className={classes.polaroids} data-count={photos.length}>
          {Array.from({ length: STACKED_BEHIND }, (_, i) => (
            <div key={i} className={classes.polaroid} data-depth={STACKED_BEHIND - i} aria-hidden />
          ))}
          {first ? (
            <UnstyledButton
              className={classes.polaroid}
              data-top
              aria-label={t('photos.openStack', { count: photos.length })}
              onClick={() => setOpenIndex(topIndex)}
            >
              {/* Signed, short-lived URLs on the storage: not something next/image can optimise. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={first.thumbnailUrl} alt="" className={classes.polaroidPhoto} />
              <span className={classes.polaroidCaption}>{caption}</span>
            </UnstyledButton>
          ) : locked ? (
            // Empty and still to come: the greyed polaroid alone.
            <div className={classes.polaroid} data-top data-empty title={t('photos.locked')}>
              <span className={classes.polaroidPhoto}>
                <IconPhoto size={48} stroke={1.2} />
              </span>
              <span className={classes.polaroidCaption}>{caption}</span>
            </div>
          ) : (
            // Empty: a greyed polaroid; a click picks photos.
            <FileButton onChange={upload} accept={ACCEPT} multiple resetRef={resetFiles}>
              {(props) => (
                <UnstyledButton
                  {...props}
                  className={classes.polaroid}
                  data-top
                  data-empty
                  aria-label={t('photos.add')}
                  title={t('photos.empty')}
                >
                  <span className={classes.polaroidPhoto}>
                    <IconPhoto size={48} stroke={1.2} />
                  </span>
                  <span className={classes.polaroidCaption}>{caption}</span>
                </UnstyledButton>
              )}
            </FileButton>
          )}
          <span className={classes.pin} aria-hidden />
          {/* Going through the photos on top of the stack. */}
          {photos.length > 1 && (
            <>
              <ActionIcon
                variant="subtle"
                size="lg"
                className={classes.stackArrow}
                data-side="left"
                aria-label={t('photos.previous')}
                title={t('photos.previous')}
                onClick={() => showNext(-1)}
              >
                <IconChevronLeft size={24} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                size="lg"
                className={classes.stackArrow}
                data-side="right"
                aria-label={t('photos.next')}
                title={t('photos.next')}
                onClick={() => showNext(1)}
              >
                <IconChevronRight size={24} />
              </ActionIcon>
            </>
          )}
          {/* Adding photos: an icon at the stack's top right. */}
          <FileButton onChange={upload} accept={ACCEPT} multiple resetRef={resetFiles}>
            {(props) => (
              <Tooltip label={t('photos.add')}>
                <ActionIcon
                  {...props}
                  variant="light"
                  size="lg"
                  className={classes.addPhotos}
                  aria-label={t('photos.add')}
                  loading={uploading}
                  disabled={locked || remaining <= 0}
                >
                  <IconPhotoPlus size={20} />
                </ActionIcon>
              </Tooltip>
            )}
          </FileButton>
        </div>

        <FormError state={state} />
        {/* The hint's sentences on their own lines (line breaks in the message). */}
        <Text size="xs" c="dimmed" ta="center" role="status" style={{ whiteSpace: 'pre-line' }}>
          {progress
            ? t('photos.uploading', { done: progress.done + 1, total: progress.total })
            : t(locked ? 'photos.locked' : 'photos.hint')}
        </Text>
      </Stack>

      <Modal opened={opened !== null} onClose={closePhoto} size="xl" centered padding="sm">
        {opened && openIndex !== null && (
          <Stack gap="sm">
            {/* Going through the stack. */}
            {photos.length > 1 && (
              <Group justify="center" gap="sm">
                <ActionIcon
                  variant="subtle"
                  aria-label={t('photos.previous')}
                  title={t('photos.previous')}
                  onClick={() => step(-1)}
                >
                  <IconChevronLeft size={20} />
                </ActionIcon>
                <Text size="sm" c="dimmed">
                  {t('photos.position', { n: openIndex + 1, total: photos.length })}
                </Text>
                <ActionIcon
                  variant="subtle"
                  aria-label={t('photos.next')}
                  title={t('photos.next')}
                  onClick={() => step(1)}
                >
                  <IconChevronRight size={20} />
                </ActionIcon>
              </Group>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={opened.url}
              alt=""
              width={opened.width}
              height={opened.height}
              className={classes.photoFull}
              // The signed link expired (page left open): fetch fresh ones, once.
              onError={() => {
                if (refreshedLinks.current) return;
                refreshedLinks.current = true;
                router.refresh();
              }}
            />
            {confirmDelete ? (
              <Group justify="space-between" gap="sm">
                <Text size="sm">{t('photos.deleteBody')}</Text>
                <Group gap="sm">
                  <Button variant="default" onClick={() => setConfirmDelete(false)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    color="red"
                    loading={deleting}
                    onClick={() =>
                      startDeleting(async () => {
                        const result = await deletePhoto(sessionId, opened.id);
                        setState(result);
                        closePhoto();
                      })
                    }
                  >
                    {t('delete')}
                  </Button>
                </Group>
              </Group>
            ) : (
              <Group justify="flex-end">
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={18} />}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t('photos.delete')}
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Modal>
    </section>
  );
}

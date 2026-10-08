'use client';

import {
  Button,
  Card,
  FileButton,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconPhotoPlus, IconTrash } from '@tabler/icons-react';
import type { SessionPhoto } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';
import { deletePhoto, uploadPhoto } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import { useRouter } from '@/i18n/navigation';
import type { ActionState } from '@/lib/action-state';
import classes from './journal.module.css';

/** Same limits as the API (which enforces them). */
const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;
/** iOS converts HEIC pictures to JPEG when the input only accepts these types. */
const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Photos of an event: thumbnails, upload, enlarge, delete. Saved right away,
 * independently of the sheet's "Save" button.
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
  const [state, setState] = useState<ActionState>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploading, startUploading] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDeleting] = useTransition();
  const resetFiles = useRef<() => void>(null);
  const refreshedLinks = useRef(false);

  const opened = photos.find((photo) => photo.id === openId) ?? null;
  const remaining = MAX_PHOTOS - photos.length;

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
    setOpenId(null);
    setConfirmDelete(false);
  };

  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2} size="h5" tt="uppercase" c="dimmed" lts={0.5}>
            {t('photos.title')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('photos.count', { count: photos.length, max: MAX_PHOTOS })}
          </Text>
        </Group>

        {photos.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('photos.empty')}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 3, xs: 4, md: 5 }} spacing="xs">
            {photos.map((photo, index) => (
              <UnstyledButton
                key={photo.id}
                className={classes.photoThumb}
                aria-label={t('photos.open', { n: index + 1 })}
                onClick={() => setOpenId(photo.id)}
              >
                {/* Signed, short-lived URLs on the storage: not something next/image can optimise. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.thumbnailUrl} alt="" />
              </UnstyledButton>
            ))}
          </SimpleGrid>
        )}

        <FormError state={state} />
        <Group gap="sm" align="center">
          <FileButton onChange={upload} accept={ACCEPT} multiple resetRef={resetFiles}>
            {(props) => (
              <Button
                {...props}
                variant="light"
                leftSection={<IconPhotoPlus size={18} />}
                loading={uploading}
                disabled={remaining <= 0}
              >
                {t('photos.add')}
              </Button>
            )}
          </FileButton>
          <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 200 }} role="status">
            {progress
              ? t('photos.uploading', { done: progress.done + 1, total: progress.total })
              : t('photos.hint')}
          </Text>
        </Group>
      </Stack>

      <Modal opened={opened !== null} onClose={closePhoto} size="xl" centered padding="sm">
        {opened && (
          <Stack gap="sm">
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
    </Card>
  );
}

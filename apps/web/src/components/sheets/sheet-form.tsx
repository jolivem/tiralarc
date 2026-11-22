'use client';

import { Button, Group, Modal, Paper, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconDeviceFloppy, IconTrash, IconX } from '@tabler/icons-react';
import type { SessionPhoto, Sheet } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { deleteSheet, deleteSheetPhoto, saveSheet, uploadSheetPhoto } from '@/app/actions/sheets';
import { FormError, SuccessNotice, useFieldError } from '@/components/form-feedback';
import journal from '@/components/journal/journal.module.css';
import { SessionPhotos } from '@/components/journal/session-photos';
import { StrengthProgramme } from '@/components/strength/strength-programme';
import { programmeMinutes } from '@/lib/strength';
import { LooseLeaf } from '@/components/notebook/loose-leaf';
import { RuledStack } from '@/components/notebook/ruled-stack';
import { useRouter } from '@/i18n/navigation';
import type { ActionState } from '@/lib/action-state';
import { PHOTO_CATEGORIES, SHEET_CATEGORIES, sheetsPath } from './categories';
import classes from './sheets.module.css';

/**
 * A sheet of the binder on its own page: a loose leaf tinted with its category's pastel, the
 * title written large on its first lines, then the free text on the ruling. Saved with an
 * explicit button (the action bar, sticky above it). A technique sheet also takes up to 4
 * photos, beside its text (the events' polaroids, saved right away). With `archerId`, the
 * archer's coach reads it: nothing changes.
 */
export function SheetForm({
  sheet,
  photos,
  archerId,
}: {
  sheet: Sheet;
  /** A technique sheet's photos (`PHOTO_CATEGORIES`); none for the other categories. */
  photos?: SessionPhoto[];
  archerId?: string;
}) {
  const t = useTranslations('sheets');
  const format = useFormatter();
  const fieldError = useFieldError();
  const router = useRouter();
  const readOnly = archerId !== undefined;
  /** A strength sheet's programme is saved with the rest (`strengthSteps`, sent for it only). */
  const strength = sheet.category === 'STRENGTH';
  const [values, setValues] = useState({
    title: sheet.title,
    body: sheet.body,
    strengthSteps: sheet.strengthSteps,
  });
  const [saved, setSaved] = useState(values);
  const [updatedAt, setUpdatedAt] = useState(sheet.updatedAt);
  const [state, setState] = useState<ActionState>({});
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setState({});
    setValues((v) => ({ ...v, [key]: value }));
  };
  const save = () =>
    startSaving(async () => {
      const snapshot = values;
      const { strengthSteps, ...text } = snapshot;
      const result = await saveSheet(sheet.id, strength ? snapshot : text);
      setState(result);
      if (!result.code) {
        setSaved(snapshot);
        setUpdatedAt(new Date().toISOString());
      }
    });
  const leave = () => router.push(sheetsPath(archerId));
  const close = () => (dirty ? setConfirmLeave(true) : leave());

  /** "22 novembre 2026". */
  const day = (date: string) => format.dateTime(new Date(date), { dateStyle: 'long' });
  const category = SHEET_CATEGORIES.find(({ id }) => id === sheet.category)!;
  const CategoryIcon = category.icon;
  const withPhotos = PHOTO_CATEGORIES.includes(sheet.category);

  return (
    <Stack gap="sm">
      <Paper withBorder shadow="md" p="sm" radius="md" className={journal.actionBar}>
        <div className={journal.actionRow}>
          {readOnly ? (
            <Text size="sm" c="dimmed">
              {t('readOnly')}
            </Text>
          ) : (
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={18} />}
              onClick={() => setConfirmDelete(true)}
            >
              {t('delete')}
            </Button>
          )}
          <Group gap="sm" wrap="nowrap">
            {!readOnly && (
              <Button
                leftSection={<IconDeviceFloppy size={18} />}
                onClick={save}
                loading={saving}
                disabled={!dirty || values.title.trim() === ''}
              >
                {t('save')}
              </Button>
            )}
            <Button variant="default" leftSection={<IconX size={18} />} onClick={close}>
              {t('close')}
            </Button>
          </Group>
        </div>
        {(state.code || state.notice) && (
          <Stack mt="sm">
            <FormError state={state} />
            {state.notice === 'saved' && !dirty && <SuccessNotice>{t('saved')}</SuccessNotice>}
          </Stack>
        )}
      </Paper>

      <div className={classes.sheetLeaf} data-category={sheet.category}>
        <LooseLeaf>
          <RuledStack>
            <TextInput
              variant="unstyled"
              classNames={{ input: classes.sheetTitle }}
              aria-label={t('title')}
              value={values.title}
              onChange={(event) => set('title', event.currentTarget.value)}
              readOnly={readOnly}
              maxLength={120}
              error={fieldError(state, 'title')}
            />
            <div className={classes.sheetCategory}>
              <CategoryIcon size={16} />
              {/* Its dates: created, and last changed when that was another day. */}
              {[
                t(`categories.${sheet.category}.name`),
                t('created', { date: day(sheet.createdAt) }),
                day(updatedAt) !== day(sheet.createdAt) && t('updated', { date: day(updatedAt) }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            {/* A strength sheet: its programme, built with the guide, above the notes. */}
            {strength && (
              <section aria-label={t('programme')}>
                {/* Its estimated length by the title (sets, ~3 s a repetition, rests). */}
                <h2 className={classes.sheetSection}>
                  {programmeMinutes(values.strengthSteps) === null
                    ? t('programme')
                    : t('programmeLength', { minutes: programmeMinutes(values.strengthSteps)! })}
                </h2>
                <StrengthProgramme
                  steps={values.strengthSteps}
                  onChange={(steps) => set('strengthSteps', steps)}
                  readOnly={readOnly}
                />
              </section>
            )}
            {strength && <h2 className={classes.sheetSection}>{t('notes')}</h2>}
            {/* The text, and a technique sheet's photos on its right (under it on phones). */}
            <div className={classes.sheetBody} data-photos={withPhotos || undefined}>
              <Textarea
                variant="unstyled"
                classNames={{ input: journal.ruledText }}
                placeholder=" "
                aria-label={t('body')}
                value={values.body}
                onChange={(event) => set('body', event.currentTarget.value)}
                readOnly={readOnly}
                autosize
                minRows={14}
                maxLength={20000}
                error={fieldError(state, 'body')}
              />
              {withPhotos && (
                <SessionPhotos
                  sessionId={sheet.id}
                  photos={photos ?? []}
                  readOnly={readOnly}
                  actions={{
                    upload: (form) => uploadSheetPhoto(sheet.id, form),
                    remove: (photoId) => deleteSheetPhoto(sheet.id, photoId),
                  }}
                />
              )}
            </div>
          </RuledStack>
        </LooseLeaf>
      </div>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={<Text fw={600}>{t('deleteTitle')}</Text>}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t('deleteBody', { title: saved.title })}</Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmDelete(false)}>
              {t('cancel')}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={() =>
                startDeleting(async () => {
                  setState(await deleteSheet(sheet.id));
                  setConfirmDelete(false);
                })
              }
            >
              {t('delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={<Text fw={600}>{t('leaveTitle')}</Text>}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t('leaveBody')}</Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setConfirmLeave(false)}>
              {t('stay')}
            </Button>
            <Button color="red" onClick={leave}>
              {t('leave')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

'use client';

import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { CustomEventType, EventColor, EventIcon } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { deleteEventType, saveEventType } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import { ColorPicker, EVENT_COLORS, IconPicker } from './event-display';
import { SESSION_TYPE_ORDER, SESSION_TYPES } from './session-types';

/**
 * Defines one of the archer's own event types (title, colour for the season overview,
 * pictogram for the month calendar), or changes / deletes one. Opens over the new-event dialog.
 */
export function CustomTypeModal({
  editing,
  customTypes,
  onClose,
  onSaved,
}: {
  /** null = closed, "new" = define one. */
  editing: CustomEventType | 'new' | null;
  /** The archer's types: the colours of the others are not offered. */
  customTypes: CustomEventType[];
  onClose: () => void;
  /** After a save: the type's id (to select it). */
  onSaved: (id: string) => void;
}) {
  const t = useTranslations('journal.customTypes');
  return (
    <Modal
      opened={editing !== null}
      onClose={onClose}
      title={<Text fw={600}>{editing === 'new' ? t('newTitle') : t('editTitle')}</Text>}
      size="md"
      centered
      // Above the new-event dialog it opens from.
      zIndex={300}
    >
      {editing && (
        <CustomTypeForm
          key={editing === 'new' ? 'new' : editing.id}
          type={editing === 'new' ? null : editing}
          colors={freeColors(customTypes, editing === 'new' ? null : editing.id)}
          onCancel={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

/**
 * The colours a type can take, so each type keeps its own in the calendars: none of the
 * built-in types' or of the archer's other types' (`ownId`: the type being changed, whose
 * colour stays offered).
 */
function freeColors(customTypes: CustomEventType[], ownId: string | null): EventColor[] {
  const taken = new Set<string>([
    ...SESSION_TYPE_ORDER.map((type) => SESSION_TYPES[type].color),
    ...customTypes.filter((c) => c.id !== ownId).map((c) => c.color),
  ]);
  return EVENT_COLORS.filter((color) => !taken.has(color));
}

function CustomTypeForm({
  type,
  colors,
  onCancel,
  onSaved,
}: {
  type: CustomEventType | null;
  colors: EventColor[];
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const t = useTranslations('journal');
  const [title, setTitle] = useState(type?.title ?? '');
  // A changed type keeps its colour; a new one starts with the first free one.
  const [color, setColor] = useState<EventColor>(type?.color ?? colors[0] ?? 'gray');
  const [icon, setIcon] = useState<EventIcon>(type?.icon ?? 'STAR');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await saveEventType(type?.id ?? null, { title: title.trim(), color, icon });
      setState(result);
      if (result.id) onSaved(result.id);
    });
  const remove = () =>
    type &&
    startTransition(async () => {
      const result = await deleteEventType(type.id);
      setState(result);
      if (!result.code) onCancel();
    });

  return (
    <Stack gap="lg">
      <TextInput
        label={t('customTypes.name')}
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        maxLength={40}
        required
        data-autofocus
      />
      <ColorPicker value={color} onChange={setColor} colors={colors} />
      <IconPicker value={icon} color={color} onChange={setIcon} />
      {confirmDelete && (
        <Alert color="red" variant="light">
          <Stack gap="sm">
            <Text size="sm">{t('customTypes.deleteBody')}</Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="default" size="xs" onClick={() => setConfirmDelete(false)}>
                {t('cancel')}
              </Button>
              <Button color="red" size="xs" onClick={remove} loading={pending}>
                {t('delete')}
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}
      <FormError state={state} />
      <Group justify="space-between" gap="sm">
        {type && !confirmDelete ? (
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={18} />}
            onClick={() => setConfirmDelete(true)}
          >
            {t('delete')}
          </Button>
        ) : (
          <span />
        )}
        <Group gap="sm">
          <Button variant="default" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button onClick={save} loading={pending} disabled={!title.trim()}>
            {t('save')}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

'use client';

import { ActionIcon, Button, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import type { CoachGroup } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import {
  createCoachGroup,
  deleteCoachGroup,
  renameCoachGroup,
  setAthleteGroup,
} from '@/app/actions/coaching';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';

/** Asks for a group's name: a new one (`group` null) or a new name for `group`. */
function NameModal({
  group,
  opened,
  onClose,
}: {
  group: CoachGroup | null;
  opened: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('coach.groups');
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>{group ? t('renameTitle') : t('add')}</Text>}
      centered
    >
      {/* Mounted on each opening so the form starts from the current name. */}
      {opened && <NameForm group={group} onDone={onClose} />}
    </Modal>
  );
}

function NameForm({ group, onDone }: { group: CoachGroup | null; onDone: () => void }) {
  const t = useTranslations('coach.groups');
  const [name, setName] = useState(group?.name ?? '');
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        startTransition(async () => {
          const result = group
            ? await renameCoachGroup(group.id, trimmed)
            : await createCoachGroup(trimmed);
          if (result.code) setState(result);
          else onDone();
        });
      }}
    >
      <Stack>
        <TextInput
          label={t('name')}
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={60}
          required
          data-autofocus
        />
        <FormError state={state} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={pending} disabled={!name.trim()}>
            {group ? t('save') : t('create')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** "New group", beside the card's title. */
export function NewGroupButton() {
  const t = useTranslations('coach.groups');
  const [opened, setOpened] = useState(false);
  return (
    <>
      <Button
        variant="default"
        size="xs"
        leftSection={<IconPlus size={16} />}
        onClick={() => setOpened(true)}
      >
        {t('add')}
      </Button>
      <NameModal group={null} opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}

/** A group's name, with its rename and delete buttons. */
export function GroupHeading({ group }: { group: CoachGroup }) {
  const t = useTranslations('coach.groups');
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const closeDelete = () => {
    setDeleting(false);
    setState({});
  };
  return (
    <Group gap={4} wrap="nowrap">
      <Text fw={700} truncate>
        {group.name}
      </Text>
      <ActionIcon
        variant="subtle"
        color="gray"
        aria-label={t('renameLabel', { name: group.name })}
        onClick={() => setRenaming(true)}
      >
        <IconPencil size={16} />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        color="red"
        aria-label={t('deleteLabel', { name: group.name })}
        onClick={() => setDeleting(true)}
      >
        <IconTrash size={16} />
      </ActionIcon>
      <NameModal group={group} opened={renaming} onClose={() => setRenaming(false)} />
      <Modal
        opened={deleting}
        onClose={closeDelete}
        title={<Text fw={600}>{t('deleteTitle')}</Text>}
        centered
      >
        <Stack>
          <Text size="sm">{t('deleteBody', { name: group.name })}</Text>
          <FormError state={state} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>
              {t('cancel')}
            </Button>
            <Button
              color="red"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteCoachGroup(group.id);
                  if (result.code) setState(result);
                  else closeDelete();
                })
              }
            >
              {t('delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Group>
  );
}

/** The group an archer is in, changed at once. */
export function AthleteGroupSelect({
  archerId,
  archerName,
  groupId,
  groups,
}: {
  archerId: string;
  archerName: string;
  groupId: string | null;
  groups: CoachGroup[];
}) {
  const t = useTranslations('coach.groups');
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  return (
    <Stack gap={4}>
      <Select
        size="xs"
        w={170}
        aria-label={t('choose', { name: archerName })}
        placeholder={t('none')}
        data={groups.map((group) => ({ value: group.id, label: group.name }))}
        value={groupId}
        disabled={pending}
        clearable
        onChange={(value) =>
          startTransition(async () => setState(await setAthleteGroup(archerId, value)))
        }
      />
      <FormError state={state} />
    </Stack>
  );
}

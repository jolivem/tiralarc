'use client';

import { ActionIcon, Button, Card, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconTrash } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState, useTransition } from 'react';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';

/**
 * Profile block: title, optional action on the right, then content. The title is written in
 * the calligraphy font the archer chooses on this page (`--font-calendar`), in bold.
 */
export function ProfileCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap" mih={36}>
          <Title
            order={2}
            ff="var(--font-calendar, var(--font-hand)), 'Segoe Print', cursive"
            fz="1.7rem"
            fw={700}
            lh={1.1}
          >
            {title}
          </Title>
          {action}
        </Group>
        {children}
      </Stack>
    </Card>
  );
}

/**
 * A profile form's last row: the "Save" button on the right (enabled once something changed),
 * the outcome of the last save written on its left — the confirmation, or the error — on the
 * same row and at most two small lines, so the card keeps its height (the full text in the
 * tooltip).
 */
export function SaveBar({
  state,
  savedLabel,
  label,
  disabled,
  loading,
}: {
  /** The last save's outcome: `notice: 'saved'` or an error `code`. */
  state: ActionState;
  /** The confirmation shown after a save. */
  savedLabel: string;
  label: string;
  disabled: boolean;
  loading: boolean;
}) {
  const tErrors = useTranslations('errors');
  const outcome = state.code
    ? { color: 'red', icon: IconAlertCircle, text: tErrors(state.code), role: 'alert' }
    : state.notice === 'saved'
      ? { color: 'teal', icon: IconCheck, text: savedLabel, role: 'status' }
      : null;
  return (
    <Group justify="flex-end" gap="sm" wrap="nowrap">
      {outcome && (
        <Group gap={4} wrap="nowrap" c={outcome.color} role={outcome.role} style={{ minWidth: 0 }}>
          <outcome.icon size={16} style={{ flexShrink: 0 }} />
          <Text size="xs" c={outcome.color} lineClamp={2} title={outcome.text}>
            {outcome.text}
          </Text>
        </Group>
      )}
      <Button type="submit" disabled={disabled} loading={loading} style={{ flexShrink: 0 }}>
        {label}
      </Button>
    </Group>
  );
}

/** One line of a profile list, with its delete button and confirmation dialog. */
export function ListRow({
  children,
  removeLabel,
  confirmTitle,
  confirmBody,
  confirmButton,
  onRemove,
}: {
  children: ReactNode;
  removeLabel: string;
  confirmTitle: string;
  confirmBody: string;
  confirmButton: string;
  onRemove: () => Promise<ActionState>;
}) {
  const t = useTranslations('profile');
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const close = () => {
    setConfirming(false);
    setState({});
  };

  return (
    <Group gap="xs" wrap="nowrap" component="li">
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <ActionIcon
        variant="subtle"
        color="red"
        size="lg"
        aria-label={removeLabel}
        onClick={() => setConfirming(true)}
      >
        <IconTrash size={18} />
      </ActionIcon>
      <Modal
        opened={confirming}
        onClose={close}
        title={<Text fw={600}>{confirmTitle}</Text>}
        centered
      >
        <Stack>
          <Text size="sm">{confirmBody}</Text>
          <FormError state={state} />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {t('cancel')}
            </Button>
            <Button
              color="red"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await onRemove();
                  if (result.code) setState(result);
                  else close();
                })
              }
            >
              {confirmButton}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Group>
  );
}

/** The list itself, or `empty` when there is nothing yet. */
export function ProfileList({ empty, children }: { empty: string; children: ReactNode[] }) {
  if (children.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {empty}
      </Text>
    );
  }
  return (
    <Stack gap="xs" component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
      {children}
    </Stack>
  );
}

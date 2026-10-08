'use client';

import { ActionIcon, Button, Card, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState, useTransition } from 'react';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';

/** Profile block: title, optional action on the right, then content. */
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
          <Title order={2} size="h5" tt="uppercase" c="dimmed" lts={0.5}>
            {title}
          </Title>
          {action}
        </Group>
        {children}
      </Stack>
    </Card>
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

'use client';

import {
  Button,
  Card,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconDownload, IconTrash } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { deleteAccount } from '@/app/actions/account';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';

/**
 * Account page, last card: "Vos données" — download everything as a ZIP archive (the JSON and
 * the photos, `account/export`), or delete the account for good, confirmed by typing its email
 * again (and its password when it has one).
 */
export function AccountDataCard({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const t = useTranslations('account.data');
  const locale = useLocale();
  const [opened, setOpened] = useState(false);
  const [typedEmail, setTypedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const matches = typedEmail.trim().toLowerCase() === email.toLowerCase();

  const close = () => {
    setOpened(false);
    setTypedEmail('');
    setPassword('');
    setState({});
  };
  const confirm = () =>
    start(async () => {
      // On success the action signs out and leaves the page.
      setState(await deleteAccount({ email: typedEmail.trim(), password }));
    });

  return (
    <Card withBorder radius="lg" padding="lg">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('title')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('exportHint')}
        </Text>
        <Group gap="sm">
          {/* A route handler streams the archive: a plain link downloads it. */}
          <Button
            component="a"
            href={`/${locale}/account/export`}
            download
            variant="default"
            leftSection={<IconDownload size={18} />}
          >
            {t('export')}
          </Button>
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={18} />}
            onClick={() => setOpened(true)}
          >
            {t('delete')}
          </Button>
        </Group>
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title={<Text fw={600}>{t('deleteTitle')}</Text>}
        centered
      >
        <Stack gap="sm">
          <Text size="sm">{t('deleteBody')}</Text>
          <Text size="sm" c="dimmed">
            {t('deleteExportFirst')}
          </Text>
          <TextInput
            label={t('typeEmail', { email })}
            value={typedEmail}
            onChange={(e) => setTypedEmail(e.currentTarget.value)}
            autoComplete="off"
            data-autofocus
          />
          {hasPassword && (
            <PasswordInput
              label={t('password')}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              autoComplete="current-password"
            />
          )}
          <FormError state={state} />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              {t('cancel')}
            </Button>
            <Button
              color="red"
              loading={pending}
              disabled={!matches || (hasPassword && password === '')}
              onClick={confirm}
            >
              {t('confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}

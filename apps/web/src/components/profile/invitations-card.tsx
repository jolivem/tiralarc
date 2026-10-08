'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconUserPlus } from '@tabler/icons-react';
import type { Invitation } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { invitePerson, removeInvitation } from '@/app/actions/profile';
import { FormError, useFieldError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import { ListRow, ProfileCard, ProfileList } from './list-card';

/** People the archer invited by email, with the state of each invitation. */
export function InvitationsCard({ invitations }: { invitations: Invitation[] }) {
  const t = useTranslations('profile');
  const isPhone = useMediaQuery('(max-width: 48em)');
  const [adding, setAdding] = useState(false);

  return (
    <ProfileCard
      title={t('guests.title')}
      action={
        <ActionIcon
          variant="light"
          size="lg"
          aria-label={t('guests.add')}
          onClick={() => setAdding(true)}
        >
          <IconUserPlus size={20} />
        </ActionIcon>
      }
    >
      <ProfileList empty={t('guests.empty')}>
        {invitations.map((guest) => (
          <ListRow
            key={guest.id}
            removeLabel={t('guests.removeLabel', { name: guest.name })}
            confirmTitle={t('guests.removeTitle')}
            confirmBody={t('guests.removeBody', { name: guest.name })}
            confirmButton={t('remove')}
            onRemove={() => removeInvitation(guest.id)}
          >
            <Group gap="xs" wrap="nowrap">
              <Text fw={500} truncate>
                {guest.name}
                {guest.isCoach && ` (${t('guests.coach')})`}
              </Text>
              <Badge
                variant="light"
                color={guest.status === 'ACCEPTED' ? 'teal' : 'gray'}
                style={{ flexShrink: 0 }}
              >
                {t(`guests.status.${guest.status}`)}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed" truncate>
              {guest.email}
            </Text>
          </ListRow>
        ))}
      </ProfileList>

      <Modal
        opened={adding}
        onClose={() => setAdding(false)}
        title={<Text fw={600}>{t('guests.add')}</Text>}
        fullScreen={isPhone}
        centered
      >
        {/* Mounted on each opening so the form starts empty. */}
        {adding && <InviteForm onDone={() => setAdding(false)} />}
      </Modal>
    </ProfileCard>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('profile');
  const fieldError = useFieldError();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isCoach, setIsCoach] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const valid = name.trim() !== '' && email.trim() !== '';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        startTransition(async () => {
          const result = await invitePerson({ name: name.trim(), email: email.trim(), isCoach });
          if (result.code) setState(result);
          else onDone();
        });
      }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('guests.addHint')}
        </Text>
        <TextInput
          label={t('guests.name')}
          placeholder={t('guests.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          maxLength={100}
          error={fieldError(state, 'name')}
          required
          data-autofocus
        />
        <TextInput
          type="email"
          label={t('guests.email')}
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          maxLength={255}
          error={fieldError(state, 'email')}
          required
        />
        <Checkbox
          label={t('guests.isCoach')}
          checked={isCoach}
          onChange={(e) => setIsCoach(e.currentTarget.checked)}
        />
        <FormError state={state} />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onDone}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={pending} disabled={!valid}>
            {t('guests.submit')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

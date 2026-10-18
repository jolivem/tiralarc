'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Radio,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconUserPlus } from '@tabler/icons-react';
import type { CoachAccess, Invitation, InvitationCreate } from '@tiralarc/api-client';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { invitePerson, removeInvitation, setCoachAccess } from '@/app/actions/profile';
import { FormError, useFieldError } from '@/components/form-feedback';
import { routing } from '@/i18n/routing';
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
            {guest.coachAccess && <AccessSelect id={guest.id} access={guest.coachAccess} />}
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

/** A coach's access to the journal of the season in progress, changed at once. */
function AccessSelect({ id, access }: { id: string; access: CoachAccess }) {
  const t = useTranslations('profile.guests');
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  return (
    <Stack gap={4} mt={6}>
      <SegmentedControl
        size="xs"
        value={access}
        disabled={pending}
        aria-label={t('access')}
        onChange={(value) =>
          startTransition(async () => setState(await setCoachAccess(id, value as CoachAccess)))
        }
        data={COACH_ACCESSES.map((value) => ({ value, label: t(`accessShort.${value}`) }))}
      />
      <FormError state={state} />
    </Stack>
  );
}

const COACH_ACCESSES: CoachAccess[] = ['READ', 'WRITE'];

/** The languages an invitation email can be written in. */
type EmailLocale = NonNullable<InvitationCreate['locale']>;

function InviteForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('profile');
  const fieldError = useFieldError();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isCoach, setIsCoach] = useState(false);
  const [coachAccess, setCoachAccessValue] = useState<CoachAccess>('READ');
  // The email's language: the page's by default.
  const pageLocale = useLocale() as EmailLocale;
  const [locale, setLocale] = useState<EmailLocale>(pageLocale);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const valid = name.trim() !== '' && email.trim() !== '';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        startTransition(async () => {
          const result = await invitePerson({
            name: name.trim(),
            email: email.trim(),
            isCoach,
            // Ignored by the API for a plain guest.
            coachAccess,
            locale,
          });
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
        <Stack gap={4}>
          <Text size="sm" fw={500} id="invitation-language">
            {t('guests.language')}
          </Text>
          <SegmentedControl
            aria-labelledby="invitation-language"
            value={locale}
            onChange={(value) => setLocale(value as EmailLocale)}
            data={routing.locales.map((value) => ({
              value,
              label: t(`guests.languages.${value}`),
            }))}
            style={{ alignSelf: 'flex-start' }}
          />
        </Stack>
        <Radio.Group
          label={t('guests.kind')}
          value={isCoach ? 'coach' : 'guest'}
          onChange={(value) => setIsCoach(value === 'coach')}
        >
          <Stack gap="xs" mt="xs">
            <Radio value="guest" label={t('guests.kindGuest')} />
            <Radio value="coach" label={t('guests.kindCoach')} />
          </Stack>
        </Radio.Group>
        {isCoach && (
          <Radio.Group
            label={t('guests.access')}
            description={t('guests.accessHint')}
            value={coachAccess}
            onChange={(value) => setCoachAccessValue(value as CoachAccess)}
          >
            <Stack gap="xs" mt="xs">
              {COACH_ACCESSES.map((value) => (
                <Radio
                  key={value}
                  value={value}
                  label={t(`guests.accessLabel.${value}`)}
                  description={t(`guests.accessDescription.${value}`)}
                />
              ))}
            </Stack>
          </Radio.Group>
        )}
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

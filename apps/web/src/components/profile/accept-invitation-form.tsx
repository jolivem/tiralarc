'use client';

import { Alert, Button, Group, Stack } from '@mantine/core';
import { IconLogin, IconNotebook, IconUserPlus } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { acceptInvitation, type AcceptInvitationState } from '@/app/actions/profile';
import { FormError, SuccessNotice } from '@/components/form-feedback';
import { Link } from '@/i18n/navigation';

const initial: AcceptInvitationState = {};

/**
 * "Accept". A coach invitation needs an account: signed out, the guest is asked to sign in
 * (then comes back here) or to create one (then opens the emailed link again).
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  const t = useTranslations('profile.accept');
  const [state, action, pending] = useActionState(acceptInvitation, initial);

  if (state.invitedBy) {
    return (
      <Stack gap="md">
        <SuccessNotice>
          {t(state.archerId ? 'doneCoach' : 'done', { name: state.invitedBy })}
        </SuccessNotice>
        {state.archerId && (
          <Button
            component={Link}
            href={`/coach/${state.archerId}/journal`}
            leftSection={<IconNotebook size={18} />}
            fullWidth
          >
            {t('openJournal')}
          </Button>
        )}
      </Stack>
    );
  }
  if (state.code === 'SIGN_IN_REQUIRED') {
    const back = `/invitations/accept?token=${encodeURIComponent(token)}`;
    return (
      <Stack gap="md">
        <Alert variant="light" color="blue">
          {t('signInRequired')}
        </Alert>
        <Group grow>
          <Button
            component={Link}
            href={{ pathname: '/login', query: { next: back } }}
            leftSection={<IconLogin size={18} />}
          >
            {t('signIn')}
          </Button>
          {/* No account yet: the site's home page first (what it is for, FAQ, sign-up). */}
          <Button
            component={Link}
            href={{ pathname: '/', query: { invitation: 'coach' } }}
            variant="default"
            leftSection={<IconUserPlus size={18} />}
          >
            {t('register')}
          </Button>
        </Group>
      </Stack>
    );
  }
  return (
    <form action={action}>
      <Stack gap="md">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" loading={pending} fullWidth>
          {t('submit')}
        </Button>
        <FormError state={state} />
      </Stack>
    </form>
  );
}

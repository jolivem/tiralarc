'use client';

import { Button, Stack } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { acceptInvitation, type AcceptInvitationState } from '@/app/actions/profile';
import { FormError, SuccessNotice } from '@/components/form-feedback';

const initial: AcceptInvitationState = {};

export function AcceptInvitationForm({ token }: { token: string }) {
  const t = useTranslations('profile.accept');
  const [state, action, pending] = useActionState(acceptInvitation, initial);

  if (state.invitedBy) return <SuccessNotice>{t('done', { name: state.invitedBy })}</SuccessNotice>;
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

'use client';

import { Alert, Button, Group } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { moderateReview } from '@/app/actions/reviews';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';

/** The moderation page's decision: publish the review on the home page, or refuse it (once). */
export function ModerationButtons({ token }: { token: string }) {
  const t = useTranslations('reviews.moderation');
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const decide = (decision: 'PUBLISH' | 'REFUSE') =>
    startTransition(async () => setState(await moderateReview(token, decision)));

  if (state.notice === 'published' || state.notice === 'refused') {
    return (
      <Alert color={state.notice === 'published' ? 'teal' : 'gray'} variant="light">
        {t(state.notice)}
      </Alert>
    );
  }
  return (
    <>
      <FormError state={state} />
      <Group justify="center" gap="sm">
        <Button
          variant="default"
          color="red"
          leftSection={<IconX size={18} />}
          onClick={() => decide('REFUSE')}
          loading={pending}
        >
          {t('refuse')}
        </Button>
        <Button
          color="teal"
          leftSection={<IconCheck size={18} />}
          onClick={() => decide('PUBLISH')}
          loading={pending}
        >
          {t('publish')}
        </Button>
      </Group>
    </>
  );
}

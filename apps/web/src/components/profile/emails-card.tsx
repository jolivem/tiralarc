'use client';

import { Stack, Switch } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { saveProfile } from '@/app/actions/profile';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import { ProfileCard } from './list-card';

type Setting = 'coachEmails' | 'competitionReminders';

/**
 * Profile page: the emails about the journal — the coach's news (at most one a day) and the
 * reminder the week before a competition —, each saved as soon as it is switched.
 */
export function EmailsCard({
  coachEmails,
  competitionReminders,
}: {
  coachEmails: boolean;
  competitionReminders: boolean;
}) {
  const t = useTranslations('profile.emails');
  const [values, setValues] = useState({ coachEmails, competitionReminders });
  const [state, setState] = useState<ActionState>({});
  const [, startTransition] = useTransition();

  const toggle = (setting: Setting, on: boolean) => {
    const before = values;
    setValues({ ...values, [setting]: on });
    startTransition(async () => {
      const result = await saveProfile({ [setting]: on });
      setState(result.code ? result : {});
      // Not saved: the switch goes back.
      if (result.code) setValues(before);
    });
  };

  return (
    <ProfileCard title={t('title')}>
      <Stack gap="md">
        {(['coachEmails', 'competitionReminders'] as const).map((setting) => (
          <Switch
            key={setting}
            label={t(`${setting}.label`)}
            description={t(`${setting}.hint`)}
            checked={values[setting]}
            onChange={(e) => toggle(setting, e.currentTarget.checked)}
          />
        ))}
        <FormError state={state} />
      </Stack>
    </ProfileCard>
  );
}

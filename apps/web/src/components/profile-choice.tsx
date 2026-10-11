'use client';

import { Group, Loader, Modal, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconSchool, IconTarget } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { chooseProfile } from '@/app/actions/auth';
import type { Profile } from '@/lib/current-user-paths';
import classes from './profile-choice.module.css';

const PROFILES = [
  { profile: 'ARCHER', icon: IconTarget },
  { profile: 'COACH', icon: IconSchool },
] as const;

/**
 * Pop-up shown right after signing in to users who are both archer and coach:
 * one round badge per profile; clicking one signs in with it. It can't be
 * dismissed: the choice is what leads to the home page.
 */
export function ProfileChoice({ next }: { next?: string }) {
  const t = useTranslations('chooseProfile');
  const tRoles = useTranslations('roles');
  const [chosen, setChosen] = useState<Profile | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (profile: Profile) => {
    setChosen(profile);
    startTransition(() => chooseProfile(profile, next));
  };

  return (
    <Modal
      opened
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered
      radius="lg"
      title={
        <Text fw={600} size="lg">
          {t('title')}
        </Text>
      }
    >
      <Stack gap="lg" pb="sm">
        <Text size="sm" c="dimmed">
          {t('body')}
        </Text>
        <Group justify="center" gap="xl">
          {PROFILES.map(({ profile, icon: Icon }) => (
            <UnstyledButton
              key={profile}
              className={classes.choice}
              onClick={() => choose(profile)}
              disabled={pending}
              aria-label={t('as', { profile: tRoles(profile) })}
            >
              <span className={classes.badge} data-profile={profile}>
                {pending && chosen === profile ? (
                  <Loader size="md" color="white" />
                ) : (
                  <Icon size={44} stroke={1.6} />
                )}
              </span>
              <Text fw={600}>{tRoles(profile)}</Text>
              <Text size="xs" c="dimmed" ta="center">
                {tRoles(`${profile}_description`)}
              </Text>
            </UnstyledButton>
          ))}
        </Group>
      </Stack>
    </Modal>
  );
}

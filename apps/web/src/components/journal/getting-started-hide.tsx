'use client';

import { Anchor } from '@mantine/core';
import { useRouter } from '@/i18n/navigation';
import { useTransition } from 'react';
import { markTourSeen } from '@/app/actions/profile';
import classes from './journal.module.css';

/** "Pour bien démarrer"'s "Masquer": kept in `toursSeen`, then the home page without it. */
export function GettingStartedHide({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Anchor
      component="button"
      type="button"
      size="sm"
      c="dimmed"
      className={classes.gettingStartedHide}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markTourSeen('getting-started');
          router.refresh();
        })
      }
    >
      {label}
    </Anchor>
  );
}

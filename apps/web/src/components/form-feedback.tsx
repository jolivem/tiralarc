'use client';

import { Alert } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { ActionState } from '@/lib/action-state';

const KNOWN_RULES = ['isEmail', 'isUrl', 'minLength', 'maxLength', 'arrayMinSize'] as const;
type KnownRule = (typeof KNOWN_RULES)[number];

/** Translated validation message for one field, for Mantine's `error` prop. */
export function useFieldError() {
  const t = useTranslations('validation');
  return (state: ActionState, field: string): string | undefined => {
    const rule = state.fieldErrors?.[field]?.[0];
    if (!rule) return undefined;
    return t((KNOWN_RULES as readonly string[]).includes(rule) ? (rule as KnownRule) : 'default');
  };
}

/** Translated error for an API error code. */
export function FormError({ state }: { state: ActionState }) {
  const t = useTranslations('errors');
  // Field-level messages are shown on the fields themselves.
  if (!state.code || state.code === 'VALIDATION_FAILED') return null;
  return (
    <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
      {t(state.code)}
    </Alert>
  );
}

export function SuccessNotice({ children }: { children: ReactNode }) {
  return (
    <Alert color="teal" variant="light" icon={<IconCircleCheck size={18} />} role="status">
      {children}
    </Alert>
  );
}

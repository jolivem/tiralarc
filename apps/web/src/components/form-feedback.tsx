'use client';

import { useTranslations } from 'next-intl';
import type { ActionState } from '@/lib/action-state';
import { Notice } from './ui';

/** Translated error for an API error code. */
export function FormError({ state }: { state: ActionState }) {
  const t = useTranslations('errors');
  // Field-level messages are shown next to the fields.
  if (!state.code || state.code === 'VALIDATION_FAILED') return null;
  return <Notice tone="error">{t(state.code)}</Notice>;
}

const KNOWN_RULES = ['isEmail', 'minLength', 'maxLength', 'arrayMinSize'] as const;

/** Translated validation messages for one field. */
export function FieldErrors({ state, field }: { state: ActionState; field: string }) {
  const t = useTranslations('validation');
  const rules = state.fieldErrors?.[field] ?? [];
  return rules.map((rule) => (
    <span key={rule} className="text-sm text-red-600">
      {t(
        (KNOWN_RULES as readonly string[]).includes(rule)
          ? (rule as (typeof KNOWN_RULES)[number])
          : 'default',
      )}
    </span>
  ));
}

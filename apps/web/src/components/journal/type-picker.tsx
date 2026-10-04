'use client';

import { SimpleGrid, Text, UnstyledButton } from '@mantine/core';
import type { SessionType } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import classes from './journal.module.css';
import { SESSION_TYPE_ORDER, SESSION_TYPES } from './session-types';

/** Four big buttons (2×2 on phones, 1×4 from tablets) to pick the session type. */
export function TypePicker({
  value,
  onChange,
}: {
  value: SessionType | null;
  onChange: (type: SessionType) => void;
}) {
  const t = useTranslations('journal');
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" role="radiogroup" aria-label={t('type')}>
      {SESSION_TYPE_ORDER.map((type) => {
        const { color, icon: Icon } = SESSION_TYPES[type];
        const selected = value === type;
        return (
          <UnstyledButton
            key={type}
            role="radio"
            aria-checked={selected}
            className={classes.typeCard}
            data-selected={selected || undefined}
            style={
              { '--type-color': `var(--mantine-color-${color}-filled)` } as React.CSSProperties
            }
            onClick={() => onChange(type)}
          >
            <Icon size={26} color={`var(--mantine-color-${color}-filled)`} />
            <Text size="sm" fw={500} ta="center" lh={1.2}>
              {t(`typesShort.${type}`)}
            </Text>
          </UnstyledButton>
        );
      })}
    </SimpleGrid>
  );
}

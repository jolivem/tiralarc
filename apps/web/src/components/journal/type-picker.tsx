'use client';

import { ActionIcon, SimpleGrid, Text, UnstyledButton } from '@mantine/core';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import type { CustomEventType, SessionType } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { EVENT_ICONS } from './event-display';
import type { EventIconComponent } from './image-icon';
import classes from './journal.module.css';
import { SESSION_TYPE_ORDER, SESSION_TYPES } from './session-types';

/** Event types an archer can define (kept by the API too). */
export const MAX_CUSTOM_TYPES = 4;

/** A built-in type, or one of the archer's own (`CUSTOM` + its id). */
export interface TypeChoice {
  type: SessionType;
  customTypeId?: string;
}

/**
 * Big buttons (2 per row on phones, 4 from tablets) to pick the event type: the built-in
 * ones, the archer's own (each with a pencil to change it), then "+" to define another.
 * Without `customTypes` (a coach planning), the built-in ones only.
 */
export function TypePicker({
  value,
  onChange,
  customTypes,
  onAdd,
  onEdit,
}: {
  value: TypeChoice | null;
  onChange: (choice: TypeChoice) => void;
  customTypes?: CustomEventType[];
  onAdd?: () => void;
  onEdit?: (type: CustomEventType) => void;
}) {
  const t = useTranslations('journal');
  const card = (
    key: string,
    choice: TypeChoice,
    color: string,
    label: string,
    Icon: EventIconComponent,
  ) => {
    const selected = value?.type === choice.type && value.customTypeId === choice.customTypeId;
    return (
      <UnstyledButton
        key={key}
        role="radio"
        aria-checked={selected}
        className={classes.typeCard}
        data-selected={selected || undefined}
        style={{ '--type-color': `var(--mantine-color-${color}-filled)` } as CSSProperties}
        onClick={() => onChange(choice)}
      >
        <Icon size={44} color={`var(--mantine-color-${color}-filled)`} />
        <Text size="sm" fw={500} ta="center" lh={1.2}>
          {label}
        </Text>
      </UnstyledButton>
    );
  };

  return (
    // From tablets, two rows of 4: the built-in types, then the archer's own (with "+" while
    // there are fewer than MAX_CUSTOM_TYPES).
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" role="radiogroup" aria-label={t('type')}>
      {SESSION_TYPE_ORDER.map((type) => {
        const { color, icon } = SESSION_TYPES[type];
        return card(type, { type }, color, t(`typesShort.${type}`), icon);
      })}
      {customTypes?.map((custom) => (
        <div key={custom.id} className={classes.customTypeCell}>
          {card(
            custom.id,
            { type: 'CUSTOM', customTypeId: custom.id },
            custom.color,
            custom.title,
            EVENT_ICONS[custom.icon],
          )}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            aria-label={t('customTypes.edit', { title: custom.title })}
            title={t('customTypes.edit', { title: custom.title })}
            onClick={() => onEdit?.(custom)}
          >
            <IconPencil size={14} />
          </ActionIcon>
        </div>
      ))}
      {customTypes && customTypes.length < MAX_CUSTOM_TYPES && (
        <UnstyledButton
          className={`${classes.typeCard} ${classes.addTypeCard}`}
          onClick={onAdd}
          aria-label={t('customTypes.add')}
          title={t('customTypes.add')}
        >
          <IconPlus size={36} />
        </UnstyledButton>
      )}
    </SimpleGrid>
  );
}

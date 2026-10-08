'use client';

import { CheckIcon, ColorSwatch, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconBell,
  IconCar,
  IconFlag,
  IconGift,
  IconHeart,
  IconMapPin,
  IconNote,
  IconShoppingCart,
  IconStar,
  IconStethoscope,
  IconTool,
  IconUsers,
} from '@tabler/icons-react';
import type { EventColor, EventIcon, JournalSessionSummary } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import classes from './journal.module.css';
import { SESSION_TYPES } from './session-types';

/** Colours (Mantine palette) and pictograms an "other" event can take, in display order. */
export const EVENT_COLORS: EventColor[] = [
  'gray',
  'red',
  'pink',
  'grape',
  'violet',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'green',
  'lime',
  'yellow',
  'orange',
];
export const EVENT_ICONS: Record<EventIcon, typeof IconNote> = {
  NOTE: IconNote,
  STAR: IconStar,
  FLAG: IconFlag,
  TOOL: IconTool,
  CART: IconShoppingCart,
  USERS: IconUsers,
  CAR: IconCar,
  MEDICAL: IconStethoscope,
  GIFT: IconGift,
  HEART: IconHeart,
  BELL: IconBell,
  PIN: IconMapPin,
};

/** Calendar colour and icon of an event: its own for an "other" event, its type's otherwise. */
export function eventDisplay(session: Pick<JournalSessionSummary, 'type' | 'color' | 'icon'>) {
  const type = SESSION_TYPES[session.type];
  if (type.form !== 'note') return { color: type.color, icon: type.icon };
  return {
    color: session.color ?? type.color,
    icon: session.icon ? EVENT_ICONS[session.icon] : type.icon,
  };
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: EventColor;
  onChange: (color: EventColor) => void;
}) {
  const t = useTranslations('journal');
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {t('color')}
      </Text>
      <Group gap="xs" role="radiogroup" aria-label={t('color')}>
        {EVENT_COLORS.map((color) => (
          <ColorSwatch
            key={color}
            component="button"
            type="button"
            role="radio"
            aria-checked={color === value}
            aria-label={t(`colors.${color}`)}
            color={`var(--mantine-color-${color}-filled)`}
            size={32}
            style={{ color: '#fff', cursor: 'pointer' }}
            onClick={() => onChange(color)}
          >
            {color === value && <CheckIcon size={14} />}
          </ColorSwatch>
        ))}
      </Group>
    </Stack>
  );
}

export function IconPicker({
  value,
  color,
  onChange,
}: {
  value: EventIcon;
  /** The event's colour, to preview the selected pictogram. */
  color: EventColor;
  onChange: (icon: EventIcon) => void;
}) {
  const t = useTranslations('journal');
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {t('icon')}
      </Text>
      <Group gap="xs" role="radiogroup" aria-label={t('icon')}>
        {(Object.keys(EVENT_ICONS) as EventIcon[]).map((icon) => {
          const Icon = EVENT_ICONS[icon];
          return (
            <UnstyledButton
              key={icon}
              role="radio"
              aria-checked={icon === value}
              aria-label={t(`icons.${icon}`)}
              className={classes.iconChoice}
              data-selected={icon === value || undefined}
              style={
                { '--type-color': `var(--mantine-color-${color}-filled)` } as React.CSSProperties
              }
              onClick={() => onChange(icon)}
            >
              <Icon size={22} />
            </UnstyledButton>
          );
        })}
      </Group>
    </Stack>
  );
}

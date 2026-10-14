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

type DisplayedSession = Pick<JournalSessionSummary, 'type' | 'color' | 'icon' | 'customType'>;

/**
 * Calendar colour and icon of an event: its own for an "other" event, its custom type's for a
 * custom one, its type's otherwise.
 */
export function eventDisplay(session: DisplayedSession) {
  const type = SESSION_TYPES[session.type];
  const own = type.form === 'note' ? session : type.form === 'text' ? session.customType : null;
  return {
    color: own?.color ?? type.color,
    icon: own?.icon ? EVENT_ICONS[own.icon] : type.icon,
  };
}

/**
 * Why an event is greyed in the calendars, if it is: its review is still to write
 * ("toComplete"), or, for a type without review, its day is still to come ("upcoming").
 * `today` is "YYYY-MM-DD".
 */
export function pendingReason(
  session: Pick<JournalSessionSummary, 'completed' | 'date'>,
  today: string,
): 'toComplete' | 'upcoming' | null {
  if (!session.completed) return 'toComplete';
  return session.date > today ? 'upcoming' : null;
}

/** An event's icon in its colour (usable from Server Components: the lookup runs here). */
export function EventIcon({ session, size = 32 }: { session: DisplayedSession; size?: number }) {
  const { color, icon: Icon } = eventDisplay(session);
  return <Icon size={size} color={`var(--mantine-color-${color}-filled)`} aria-hidden />;
}

export function ColorPicker({
  value,
  onChange,
  colors = EVENT_COLORS,
}: {
  value: EventColor;
  onChange: (color: EventColor) => void;
  /** The colours offered (all of them by default). */
  colors?: EventColor[];
}) {
  const t = useTranslations('journal');
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {t('color')}
      </Text>
      <Group gap="xs" role="radiogroup" aria-label={t('color')}>
        {colors.map((color) => (
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

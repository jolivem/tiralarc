'use client';

import { Anchor, Group, HoverCard, Stack, Text } from '@mantine/core';
import type { CustomEventType } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { EVENT_ICONS } from './event-display';
import type { EventIconComponent } from './image-icon';
import { SESSION_TYPE_ORDER, SESSION_TYPES } from './session-types';

/** "Legend" link: hovering it shows each event type, the archer's own included, with its icon. */
export function EventLegend({ customTypes }: { customTypes: CustomEventType[] }) {
  const t = useTranslations('journal');
  const rows: { key: string; color: string; icon: EventIconComponent; label: string }[] = [
    ...SESSION_TYPE_ORDER.map((type) => ({
      key: type,
      color: SESSION_TYPES[type].color,
      icon: SESSION_TYPES[type].icon,
      label: t(`types.${type}`),
    })),
    ...customTypes.map((custom) => ({
      key: custom.id,
      color: custom.color,
      icon: EVENT_ICONS[custom.icon],
      label: custom.title,
    })),
  ];
  return (
    <HoverCard position="bottom-end" shadow="md" withArrow openDelay={100} closeDelay={100}>
      <HoverCard.Target>
        <Anchor component="button" type="button" size="sm">
          {t('legend')}
        </Anchor>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Stack gap={8}>
          {rows.map(({ key, color, icon: Icon, label }) => (
            <Group key={key} gap="sm" wrap="nowrap">
              <Icon size={24} color={`var(--mantine-color-${color}-filled)`} aria-hidden />
              <Text size="sm">{label}</Text>
            </Group>
          ))}
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

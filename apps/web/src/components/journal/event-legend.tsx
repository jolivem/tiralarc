'use client';

import { Anchor, Group, HoverCard, Paper, Stack, Text } from '@mantine/core';
import type { CustomEventType } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { EVENT_ICONS } from './event-display';
import type { EventIconComponent } from './image-icon';
import { SESSION_TYPE_ORDER, SESSION_TYPES } from './session-types';

/** Each event type, the archer's own included, with its icon in its colour. */
export function useLegendRows(customTypes: CustomEventType[]) {
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
  return rows;
}

/** "Legend" link: hovering it shows each event type, the archer's own included, with its icon. */
export function EventLegend({ customTypes }: { customTypes: CustomEventType[] }) {
  const t = useTranslations('journal');
  const rows = useLegendRows(customTypes);
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

/** A coloured dot as under the days of the season's calendar (MonthsOverview). */
function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        width: 10,
        height: 10,
        flex: 'none',
        borderRadius: '50%',
        background: `var(--mantine-color-${color}-filled)`,
      }}
    />
  );
}

/** The legend of the season's calendar, in a small framed box: each type's dot colour side by side. */
export function EventLegendPanel({ customTypes }: { customTypes: CustomEventType[] }) {
  const t = useTranslations('journal');
  const rows = useLegendRows(customTypes);
  return (
    <Paper withBorder radius="md" px="md" py="xs" w="fit-content" maw="100%" mx="auto">
      <Group gap="xs" wrap="wrap" justify="center" role="list" aria-label={t('legend')}>
        <Text size="sm" fw={600} mr="xs">
          {t('legend')}
        </Text>
        {rows.map(({ key, color, label }) => (
          <Group key={key} gap={6} wrap="nowrap" role="listitem" mr="sm">
            <Dot color={color} />
            <Text size="sm">{label}</Text>
          </Group>
        ))}
      </Group>
    </Paper>
  );
}

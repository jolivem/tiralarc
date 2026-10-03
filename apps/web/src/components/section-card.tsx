'use client';

import { Card, Group, Text, ThemeIcon } from '@mantine/core';
import { IconChartLine, IconFileText, IconId, IconNotebook } from '@tabler/icons-react';
import { Link } from '@/i18n/navigation';

const ICONS = {
  journal: IconNotebook,
  sheets: IconFileText,
  stats: IconChartLine,
  profile: IconId,
} as const;

/** Clickable card leading to an archer section (home dashboard). */
export function SectionCard({
  section,
  title,
  description,
}: {
  section: keyof typeof ICONS;
  title: string;
  description: string;
}) {
  const Icon = ICONS[section];
  return (
    <Card component={Link} href={`/archer/${section}`} withBorder radius="lg" padding="lg">
      <Group gap="sm" mb="xs" wrap="nowrap">
        <ThemeIcon variant="light" size={40} radius="md">
          <Icon size={22} />
        </ThemeIcon>
        <Text fw={600}>{title}</Text>
      </Group>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Card>
  );
}

import { Badge, Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

/** Common header for app sections: title, optional actions, intro, then content. */
export function SectionPage({
  title,
  intro,
  actions,
  badge,
  children,
}: {
  title: string;
  intro?: string;
  actions?: ReactNode;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <Stack gap="lg" maw={1200} mx="auto">
      <Group justify="space-between" align="flex-start" gap="sm">
        <Stack gap={4}>
          <Group gap="sm">
            <Title order={1} size="h2">
              {title}
            </Title>
            {badge && (
              <Badge variant="light" color="gray">
                {badge}
              </Badge>
            )}
          </Group>
          {intro && (
            <Text c="dimmed" maw={640}>
              {intro}
            </Text>
          )}
        </Stack>
        {actions}
      </Group>
      {children}
    </Stack>
  );
}

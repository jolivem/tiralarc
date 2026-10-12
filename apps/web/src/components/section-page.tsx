import { Badge, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import binder from '@/components/binder/binder.module.css';
import { HandHeading, Notebook, type NotebookPages } from '@/components/notebook/notebook';

/**
 * An archer section, laid out like the home page: the title (with its badge, intro and
 * actions) on the desk above an open notebook holding the content — two pages, or one
 * wide page (see `NotebookPages`). Renders direct children of the archer layout's grid,
 * so the divider tabs start level with the notebook.
 */
export function SectionPage({
  title,
  intro,
  actions,
  badge,
  plain,
  ...pages
}: NotebookPages & {
  title: string;
  intro?: string;
  actions?: ReactNode;
  badge?: string;
  /** Unruled notebook paper. */
  plain?: boolean;
}) {
  return (
    <>
      <Group className={binder.header} justify="space-between" align="flex-start" gap="sm">
        <Stack gap={4}>
          <Group gap="sm">
            <HandHeading order={1}>{title}</HandHeading>
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
      <Notebook label={title} plain={plain} {...pages} />
    </>
  );
}

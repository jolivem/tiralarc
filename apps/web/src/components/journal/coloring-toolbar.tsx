'use client';

import { ActionIcon, Button, CheckIcon, ColorSwatch, Group, Paper, Text } from '@mantine/core';
import { IconArrowBackUp, IconEraser, IconTrash } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { type ColoringTool, ERASER } from './calendar-frame';

/** Crayon box, in display order. Keys name the colours in the message files. */
export const PALETTE = {
  red: '#e03131',
  orange: '#f76707',
  yellow: '#ffd43b',
  lime: '#94d82d',
  green: '#2f9e44',
  teal: '#12b886',
  sky: '#74c0fc',
  blue: '#1c7ed6',
  violet: '#7950f2',
  pink: '#f783ac',
  brown: '#a0522d',
  beige: '#ffe8cc',
  gray: '#adb5bd',
  black: '#343a40',
  white: '#ffffff',
} as const;
export const DEFAULT_COLOR = PALETTE.red;

/** Colours, eraser, undo and clear, shown above the decoration while colouring. */
export function ColoringToolbar({
  tool,
  onToolChange,
  canUndo,
  onUndo,
  canClear,
  onClear,
  onDone,
  status,
}: {
  tool: ColoringTool;
  onToolChange: (tool: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  canClear: boolean;
  onClear: () => void;
  onDone: () => void;
  /** Saving state, or an error message. */
  status: string;
}) {
  const t = useTranslations('journals.coloring');
  return (
    <Paper withBorder radius="md" p="sm" mb="sm">
      <Group gap="sm" justify="space-between">
        <Group gap={6} role="radiogroup" aria-label={t('colors')}>
          {(Object.keys(PALETTE) as (keyof typeof PALETTE)[]).map((name) => {
            const color = PALETTE[name];
            const light = name === 'white' || name === 'beige' || name === 'yellow';
            return (
              <ColorSwatch
                key={name}
                component="button"
                type="button"
                role="radio"
                aria-checked={tool === color}
                aria-label={t(`palette.${name}`)}
                color={color}
                size={30}
                style={{ color: light ? '#343a40' : '#fff', cursor: 'pointer' }}
                onClick={() => onToolChange(color)}
              >
                {tool === color && <CheckIcon size={13} />}
              </ColorSwatch>
            );
          })}
          <ActionIcon
            role="radio"
            aria-checked={tool === ERASER}
            aria-label={t('eraser')}
            title={t('eraser')}
            variant={tool === ERASER ? 'filled' : 'default'}
            radius="xl"
            size={30}
            onClick={() => onToolChange(ERASER)}
          >
            <IconEraser size={18} />
          </ActionIcon>
        </Group>
        <Group gap="xs">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label={t('undo')}
            title={t('undo')}
            disabled={!canUndo}
            onClick={onUndo}
          >
            <IconArrowBackUp size={18} />
          </ActionIcon>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label={t('clear')}
            title={t('clear')}
            disabled={!canClear}
            onClick={onClear}
          >
            <IconTrash size={18} />
          </ActionIcon>
          <Button onClick={onDone}>{t('done')}</Button>
        </Group>
      </Group>
      <Text size="sm" c="dimmed" mt={6} role="status">
        {status || t('hint')}
      </Text>
    </Paper>
  );
}

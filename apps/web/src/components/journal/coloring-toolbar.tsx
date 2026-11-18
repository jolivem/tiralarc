'use client';

import {
  ActionIcon,
  Button,
  CheckIcon,
  ColorSwatch,
  Group,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { IconArrowBackUp, IconEraser, IconTrash, IconWand } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { type ColoringTool, ERASER } from './calendar-frame';
import classes from './journal.module.css';

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

type ColorName = keyof typeof PALETTE;

/** The same crayons, pastel (no pastel white): a second row. */
export const PASTELS: Partial<Record<ColorName, string>> = {
  red: '#ffc9c9',
  orange: '#ffd8a8',
  yellow: '#fff3bf',
  lime: '#e9fac8',
  green: '#b2f2bb',
  teal: '#c3fae8',
  sky: '#e7f5ff',
  blue: '#a5d8ff',
  violet: '#d0bfff',
  pink: '#fcc2d7',
  brown: '#e6c9a8',
  beige: '#fff4e6',
  gray: '#e9ecef',
  black: '#868e96',
};

/**
 * Colours (a row of crayons, a row of their pastels), eraser, undo and clear, shown above the
 * decoration while colouring; `onAuto` colours the decoration in real-life colours at once.
 */
export function ColoringToolbar({
  tool,
  onToolChange,
  canUndo,
  onUndo,
  canClear,
  onClear,
  onAuto,
  autoBusy = false,
  onDone,
  status,
}: {
  tool: ColoringTool;
  onToolChange: (tool: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  canClear: boolean;
  onClear: () => void;
  /** The month has a decoration: colour it automatically. */
  onAuto?: () => void;
  autoBusy?: boolean;
  onDone: () => void;
  /** Saving state, or an error message. */
  status: string;
}) {
  const t = useTranslations('journals.coloring');
  const swatch = (name: ColorName, color: string, label: string, light: boolean) => (
    <ColorSwatch
      key={`${name}-${color}`}
      component="button"
      type="button"
      role="radio"
      aria-checked={tool === color}
      aria-label={label}
      title={label}
      color={color}
      size={30}
      style={{ color: light ? '#343a40' : '#fff', cursor: 'pointer' }}
      onClick={() => onToolChange(color)}
    >
      {tool === color && <CheckIcon size={13} />}
    </ColorSwatch>
  );
  const names = Object.keys(PALETTE) as ColorName[];
  return (
    <Paper withBorder radius="md" p="sm" mb="sm" className={classes.coloringBar}>
      <Group gap="sm" justify="space-between" align="flex-start">
        <Stack gap={6} role="radiogroup" aria-label={t('colors')}>
          <Group gap={6}>
            {names.map((name) =>
              swatch(
                name,
                PALETTE[name],
                t(`palette.${name}`),
                name === 'white' || name === 'beige' || name === 'yellow',
              ),
            )}
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
          <Group gap={6}>
            {names.map((name) => {
              const pastel = PASTELS[name];
              return pastel
                ? swatch(
                    name,
                    pastel,
                    t('pastel', { color: t(`palette.${name}`) }),
                    name !== 'black',
                  )
                : null;
            })}
          </Group>
        </Stack>
        <Group gap="xs">
          {onAuto && (
            <Button
              variant="light"
              leftSection={<IconWand size={18} />}
              loading={autoBusy}
              onClick={onAuto}
              title={t('autoHint')}
            >
              {t('auto')}
            </Button>
          )}
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

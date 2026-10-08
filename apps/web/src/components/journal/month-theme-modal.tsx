'use client';

import { Modal, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconBan } from '@tabler/icons-react';
import type { Journal } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { setMonthTheme } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import classes from './journal.module.css';
import { findTheme, THEME_IDS, type ThemeId, themeImage } from './themes';

/** Theme of a month ("YYYY-MM") of the journal, if this client ships it. */
export function monthTheme(journal: Journal, month: string): ThemeId | null {
  return findTheme(journal.monthThemes.find((m) => m.month === month)?.theme);
}

/** Picks the calendar decoration of one month: none, or one of the themes. Applied on click. */
export function MonthThemeModal({
  journal,
  month,
  opened,
  onClose,
}: {
  journal: Journal;
  /** "YYYY-MM" */
  month: string;
  opened: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('journals');
  const format = useFormatter();
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const current = monthTheme(journal, month);
  const title = t('monthTheme', {
    month: format.dateTime(new Date(`${month}-15T12:00:00`), { month: 'long', year: 'numeric' }),
  });

  const choose = (theme: ThemeId | null) =>
    startTransition(async () => {
      const result = await setMonthTheme(journal.id, month, theme);
      setState(result);
      if (!result.code) onClose();
    });

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={600}>{title}</Text>} centered>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('monthThemeHint')}
        </Text>
        <SimpleGrid cols={3} spacing="xs" role="radiogroup" aria-label={title}>
          {[null, ...THEME_IDS].map((id) => (
            <UnstyledButton
              key={id ?? 'none'}
              role="radio"
              aria-checked={id === current}
              className={classes.themeChoice}
              data-selected={id === current || undefined}
              disabled={pending}
              onClick={() => choose(id)}
            >
              <span className={classes.themeThumb}>
                {id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={themeImage(id, 'thumb')} alt="" />
                ) : (
                  <IconBan size={28} />
                )}
              </span>
              <Text size="xs" fw={500} ta="center" lh={1.2}>
                {id ? t(`themes.${id}`) : t('noTheme')}
              </Text>
            </UnstyledButton>
          ))}
        </SimpleGrid>
        <FormError state={state} />
      </Stack>
    </Modal>
  );
}

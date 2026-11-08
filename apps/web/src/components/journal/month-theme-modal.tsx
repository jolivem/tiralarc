'use client';

import {
  Button,
  CheckIcon,
  ColorSwatch,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconBan } from '@tabler/icons-react';
import type { Journal } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState, useTransition } from 'react';
import { setMonthTheme } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import classes from './journal.module.css';
import { PASTELS } from './month-title';
import { findTheme, THEME_IDS, type ThemeId, themeImage } from './themes';

/** Theme of a month ("YYYY-MM") of the journal, if this client ships it. */
export function monthTheme(journal: Journal, month: string): ThemeId | null {
  return findTheme(journal.monthThemes.find((m) => m.month === month)?.theme);
}

/**
 * Picks the calendar decoration of one month (none, or one of the themes) and the pastel
 * colour its name is coloured in (shown at once on the calendar, to compare). Closing the
 * dialog applies them, once confirmed if that loses the colouring of the current decoration.
 */
export function MonthThemeModal({
  journal,
  month,
  opened,
  onClose,
  hasColoring,
  titleColor,
  onTitleColorChange,
  onSaveTitle,
  onDiscardTitle,
  onThemeChanged,
}: {
  journal: Journal;
  /** "YYYY-MM" */
  month: string;
  opened: boolean;
  onClose: () => void;
  /** The current decoration has been coloured (the month's name doesn't count: it stays). */
  hasColoring: boolean;
  /** The colour of all the name's letters; null when uncoloured, or coloured letter by letter. */
  titleColor: string | null;
  /** Tries a colour on the name. Absent while it can't be coloured yet (its font is loading). */
  onTitleColorChange?: (color: string | null) => void;
  onSaveTitle: () => Promise<ActionState>;
  onDiscardTitle: () => void;
  onThemeChanged: () => void;
}) {
  const t = useTranslations('journals');
  const format = useFormatter();
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  // The decoration clicked in the list; undefined until then (null is "no decoration").
  const [picked, setPicked] = useState<ThemeId | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const colorLabel = useId();
  const current = monthTheme(journal, month);
  const selected = picked === undefined ? current : picked;
  const title = t('monthTheme', {
    month: format.dateTime(new Date(`${month}-15T12:00:00`), { month: 'long', year: 'numeric' }),
  });

  const finish = () => {
    setPicked(undefined);
    setConfirming(false);
    setState({});
    onClose();
  };
  const apply = (theme: ThemeId | null) =>
    startTransition(async () => {
      // The name first: changing the decoration keeps the name's colouring, as saved.
      const saved = await onSaveTitle();
      setState(saved);
      if (saved.code) return;
      if (theme !== current) {
        const result = await setMonthTheme(journal.id, month, theme);
        setState(result);
        if (result.code) return;
        onThemeChanged();
      }
      finish();
    });
  const close = () => {
    if (pending) return;
    if (state.code) {
      // The error was shown: closing again gives up rather than trapping the archer here.
      onDiscardTitle();
      finish();
    } else if (selected !== current && hasColoring) setConfirming(true);
    else apply(selected);
  };
  /** The decoration and its colouring stay; the dialog closes as usual (the name's colour too). */
  const keepDecoration = () => {
    setPicked(undefined);
    setConfirming(false);
    setState({});
    apply(current);
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={<Text fw={600}>{title}</Text>}
      // The confirmation above it handles these itself.
      closeOnEscape={!confirming}
      closeOnClickOutside={!confirming}
      // At the bottom of the screen, full size, over a light veil: the month's name stays in
      // sight while choosing. (A large top offset would also cap its height and scroll it.)
      yOffset="1rem"
      styles={{ inner: { alignItems: 'flex-end' } }}
      overlayProps={{ backgroundOpacity: 0.15 }}
    >
      <Stack gap="md">
        {/* First the name's colour, then the decoration. */}
        <Stack gap={6}>
          <Text size="sm" fw={500} id={colorLabel}>
            {t('titleColor')}
          </Text>
          <Group gap="xs" role="radiogroup" aria-labelledby={colorLabel}>
            <Tooltip label={t('noTitleColor')}>
              <ColorSwatch
                component="button"
                type="button"
                role="radio"
                aria-checked={titleColor === null}
                aria-label={t('noTitleColor')}
                color="transparent"
                size={32}
                disabled={!onTitleColorChange}
                style={{ cursor: 'pointer' }}
                onClick={() => onTitleColorChange?.(null)}
              >
                {titleColor === null ? <CheckIcon size={14} /> : <IconBan size={18} />}
              </ColorSwatch>
            </Tooltip>
            {(Object.keys(PASTELS) as (keyof typeof PASTELS)[]).map((name) => (
              <Tooltip key={name} label={t(`pastels.${name}`)}>
                <ColorSwatch
                  component="button"
                  type="button"
                  role="radio"
                  aria-checked={titleColor === PASTELS[name]}
                  aria-label={t(`pastels.${name}`)}
                  color={PASTELS[name]}
                  size={32}
                  disabled={!onTitleColorChange}
                  // Dark tick: every pastel is light.
                  style={{ color: '#343a40', cursor: 'pointer' }}
                  onClick={() => onTitleColorChange?.(PASTELS[name])}
                >
                  {titleColor === PASTELS[name] && <CheckIcon size={14} />}
                </ColorSwatch>
              </Tooltip>
            ))}
          </Group>
        </Stack>
        <Text size="sm" c="dimmed">
          {t('monthThemeHint')}
        </Text>
        <SimpleGrid cols={3} spacing="xs" role="radiogroup" aria-label={title}>
          {[null, ...THEME_IDS].map((id) => (
            <UnstyledButton
              key={id ?? 'none'}
              role="radio"
              aria-checked={id === selected}
              className={classes.themeChoice}
              data-selected={id === selected || undefined}
              disabled={pending}
              onClick={() => setPicked(id)}
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
      <Modal
        opened={confirming}
        onClose={keepDecoration}
        title={<Text fw={600}>{t('replaceThemeTitle')}</Text>}
        centered
        // Above the dialog it opens from.
        zIndex={300}
      >
        <Stack>
          <Text size="sm">{t('replaceThemeBody')}</Text>
          <FormError state={state} />
          <Group justify="flex-end">
            <Button variant="default" onClick={keepDecoration}>
              {t('cancel')}
            </Button>
            <Button color="red" loading={pending} onClick={() => apply(selected)}>
              {t('replaceThemeConfirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  );
}

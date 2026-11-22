'use client';

import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { SheetCategory, SheetTemplate } from '@tiralarc/api-client';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { createSheet } from '@/app/actions/sheets';
import { FormError, useFieldError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';

/**
 * "+" in a part of the binder: a dialog takes the new sheet's title only — and, when the part
 * has ready-made sheets (`templates`), the one to start from, listed first (it gives its title
 * unless the archer wrote their own; its text shows below it, as a preview; the API copies it).
 * The new sheet then opens on its page, where its text is written.
 */
export function NewSheetButton({
  category,
  name,
  templates,
  tour,
}: {
  category: SheetCategory;
  name: string;
  templates: SheetTemplate[];
  /** Its guided tour step (`data-tour`), if any. */
  tour?: string;
}) {
  const t = useTranslations('sheets');
  const locale = useLocale();
  const fieldError = useFieldError();
  const [opened, setOpened] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const open = () => {
    setTemplateId(null);
    setTitle('');
    setState({});
    setOpened(true);
  };
  /** The template's title, unless the archer wrote their own (empty, or the previous one's). */
  const pickTemplate = (id: string | null) => {
    const previous = templates.find((template) => template.id === templateId);
    const next = templates.find((template) => template.id === id);
    if (title.trim() === '' || title === previous?.title) setTitle(next?.title ?? '');
    setTemplateId(id);
  };
  const template = templates.find(({ id }) => id === templateId);
  // On success the action opens the new sheet.
  const create = () =>
    startTransition(async () =>
      setState(await createSheet({ category, title, templateId: templateId ?? undefined, locale })),
    );

  return (
    <>
      <ActionIcon
        variant="filled"
        // In the colour of its part's title (`--accent`, sheets.module.css): Mantine sets its
        // colour variables itself, so they are replaced here.
        vars={() => ({
          root: {
            '--ai-bg': 'var(--accent)',
            '--ai-hover': 'color-mix(in srgb, var(--accent) 85%, black)',
            '--ai-color': 'var(--paper)',
          },
        })}
        radius="xl"
        size="lg"
        data-tour={tour}
        onClick={open}
        aria-label={t('add', { category: name })}
        title={t('add', { category: name })}
      >
        <IconPlus size={20} />
      </ActionIcon>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Text fw={600}>{t('newTitle', { category: name })}</Text>}
        centered
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
        >
          <Stack gap="md">
            {templates.length > 0 && (
              <Select
                label={t('template')}
                description={t('templateHint')}
                placeholder={t('blank')}
                data={templates.map((template) => ({ value: template.id, label: template.title }))}
                value={templateId}
                onChange={pickTemplate}
                clearable
                allowDeselect
                comboboxProps={{ withinPortal: true }}
              />
            )}
            {/* What the sheet will start with: the chosen template's text, read only. */}
            {template && (
              <Paper withBorder radius="sm" p="sm" bg="var(--mantine-color-default-hover)">
                <Text size="xs" c="dimmed" mb={4}>
                  {t('preview')}
                </Text>
                <ScrollArea.Autosize mah={220} type="auto">
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {template.body}
                  </Text>
                </ScrollArea.Autosize>
              </Paper>
            )}
            <TextInput
              label={t('title')}
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              maxLength={120}
              error={fieldError(state, 'title')}
              required
              data-autofocus
            />
            <FormError state={state} />
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setOpened(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" loading={pending} disabled={title.trim() === ''}>
                {t('create')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

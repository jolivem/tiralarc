'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconEye,
  IconEyeOff,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import type { AdminSheetTemplate, SheetCategory, SheetTemplateInput } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import {
  deleteSheetTemplate,
  moveSheetTemplate,
  saveSheetTemplate,
  setSheetTemplateHidden,
} from '@/app/actions/admin';
import { FormError, useFieldError } from '@/components/form-feedback';
import { SHEET_CATEGORIES } from '@/components/sheets/categories';
import type { ActionState } from '@/lib/action-state';

const EMPTY: SheetTemplateInput = {
  category: 'TECHNIQUE',
  titleFr: '',
  bodyFr: '',
  titleEn: '',
  bodyEn: '',
  hidden: false,
};

/**
 * The admins' page of sheet templates: a tab per category of the binder, its templates in the
 * order "+" offers them (arrows to move one), each written in French and English, hidden from
 * the archers while not ready. Creating or editing opens the two languages side by side.
 */
export function SheetTemplatesAdmin({ templates }: { templates: AdminSheetTemplate[] }) {
  const t = useTranslations('admin.templates');
  const tSheets = useTranslations('sheets');
  const [tab, setTab] = useState<SheetCategory>('TECHNIQUE');
  /** The template in the editor: its id (null = a new one) and values. */
  const [editing, setEditing] = useState<{ id: string | null; values: SheetTemplateInput } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<AdminSheetTemplate | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionState>, then?: () => void) =>
    startTransition(async () => {
      const result = await action();
      setState(result);
      if (!result.code) then?.();
    });

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={1}>{t('title')}</Title>
          <Text c="dimmed" maw={640}>
            {t('intro')}
          </Text>
        </Stack>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => {
            setState({});
            setEditing({ id: null, values: { ...EMPTY, category: tab } });
          }}
        >
          {t('new')}
        </Button>
      </Group>
      {!editing && !deleting && <FormError state={state} />}

      <Tabs value={tab} onChange={(value) => value && setTab(value as SheetCategory)}>
        <Tabs.List>
          {SHEET_CATEGORIES.map(({ id, icon: Icon }) => (
            <Tabs.Tab key={id} value={id} leftSection={<Icon size={16} />}>
              {tSheets(`categories.${id}.name`)} (
              {templates.filter((template) => template.category === id).length})
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {SHEET_CATEGORIES.map(({ id }) => {
          const inTab = templates.filter((template) => template.category === id);
          return (
            <Tabs.Panel key={id} value={id} pt="md">
              {inTab.length === 0 ? (
                <Text c="dimmed">{t('none')}</Text>
              ) : (
                <Stack gap="sm">
                  {inTab.map((template, i) => (
                    <Card key={template.id} withBorder padding="sm" radius="md">
                      <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <Stack gap={2} miw={0}>
                          <Group gap="xs">
                            <Text fw={600}>
                              {template.position}. {template.titleFr}
                            </Text>
                            <Text c="dimmed">· {template.titleEn}</Text>
                            {template.hidden && (
                              <Badge color="gray" variant="light">
                                {t('hidden')}
                              </Badge>
                            )}
                          </Group>
                          <Text
                            size="sm"
                            c="dimmed"
                            lineClamp={2}
                            style={{ whiteSpace: 'pre-line' }}
                          >
                            {template.bodyFr}
                          </Text>
                        </Stack>
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            aria-label={t('up')}
                            title={t('up')}
                            disabled={i === 0 || pending}
                            onClick={() => run(() => moveSheetTemplate(template.id, 'UP'))}
                          >
                            <IconArrowUp size={18} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            aria-label={t('down')}
                            title={t('down')}
                            disabled={i === inTab.length - 1 || pending}
                            onClick={() => run(() => moveSheetTemplate(template.id, 'DOWN'))}
                          >
                            <IconArrowDown size={18} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            aria-label={template.hidden ? t('show') : t('hide')}
                            title={template.hidden ? t('show') : t('hide')}
                            disabled={pending}
                            onClick={() =>
                              run(() => setSheetTemplateHidden(template.id, !template.hidden))
                            }
                          >
                            {template.hidden ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            aria-label={t('edit')}
                            title={t('edit')}
                            onClick={() => {
                              setState({});
                              const { category, titleFr, bodyFr, titleEn, bodyEn, hidden } =
                                template;
                              setEditing({
                                id: template.id,
                                values: { category, titleFr, bodyFr, titleEn, bodyEn, hidden },
                              });
                            }}
                          >
                            <IconPencil size={18} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={t('delete')}
                            title={t('delete')}
                            onClick={() => {
                              setState({});
                              setDeleting(template);
                            }}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </Tabs.Panel>
          );
        })}
      </Tabs>

      {editing && (
        <TemplateEditor
          editing={editing}
          state={state}
          pending={pending}
          onChange={(values) => setEditing({ ...editing, values })}
          onClose={() => setEditing(null)}
          onSave={() =>
            run(
              () => saveSheetTemplate(editing.id, editing.values),
              () => {
                setTab(editing.values.category);
                setEditing(null);
              },
            )
          }
        />
      )}

      <Modal
        opened={deleting !== null}
        onClose={() => setDeleting(null)}
        title={<Text fw={600}>{t('deleteTitle')}</Text>}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t('deleteBody', { title: deleting?.titleFr ?? '' })}</Text>
          <FormError state={state} />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleting(null)}>
              {t('cancel')}
            </Button>
            <Button
              color="red"
              loading={pending}
              onClick={() =>
                deleting &&
                run(
                  () => deleteSheetTemplate(deleting.id),
                  () => setDeleting(null),
                )
              }
            >
              {t('delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

/** A template's two languages side by side (one under the other on phones), and a preview. */
function TemplateEditor({
  editing,
  state,
  pending,
  onChange,
  onClose,
  onSave,
}: {
  editing: { id: string | null; values: SheetTemplateInput };
  state: ActionState;
  pending: boolean;
  onChange: (values: SheetTemplateInput) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const t = useTranslations('admin.templates');
  const tSheets = useTranslations('sheets');
  const fieldError = useFieldError();
  const { values } = editing;
  const set = <K extends keyof SheetTemplateInput>(key: K, value: SheetTemplateInput[K]) =>
    onChange({ ...values, [key]: value });
  const complete = values.titleFr.trim() !== '' && values.titleEn.trim() !== '';

  const language = (lang: 'Fr' | 'En') => (
    <Stack gap="sm">
      <Text fw={700}>{t(`language${lang}`)}</Text>
      <TextInput
        label={t('templateTitle')}
        value={values[`title${lang}`]}
        onChange={(event) => set(`title${lang}`, event.currentTarget.value)}
        maxLength={120}
        error={fieldError(state, `title${lang}`)}
        required
      />
      <Textarea
        label={t('body')}
        description={t('bodyHint')}
        value={values[`body${lang}`]}
        onChange={(event) => set(`body${lang}`, event.currentTarget.value)}
        maxLength={20000}
        autosize
        minRows={10}
        maxRows={22}
        error={fieldError(state, `body${lang}`)}
      />
      {/* As an archer sees it when picking it (the "+" dialog's preview). */}
      <Text size="xs" c="dimmed">
        {t('preview')}
      </Text>
      <Card withBorder padding="sm" radius="sm" bg="var(--mantine-color-default-hover)">
        <ScrollArea.Autosize mah={180} type="auto">
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {values[`body${lang}`] || '—'}
          </Text>
        </ScrollArea.Autosize>
      </Card>
    </Stack>
  );

  return (
    <Modal
      opened
      onClose={onClose}
      size="xl"
      title={<Text fw={600}>{editing.id ? t('editTitle') : t('newTitle')}</Text>}
      centered
    >
      <Stack gap="md">
        <Group gap="lg" align="flex-end">
          <Select
            label={t('category')}
            data={SHEET_CATEGORIES.map(({ id }) => ({
              value: id,
              label: tSheets(`categories.${id}.name`),
            }))}
            value={values.category}
            onChange={(value) => value && set('category', value as SheetCategory)}
            allowDeselect={false}
            comboboxProps={{ withinPortal: true }}
          />
          <Switch
            label={t('hiddenSwitch')}
            checked={values.hidden ?? false}
            onChange={(event) => set('hidden', event.currentTarget.checked)}
            mb={8}
          />
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {language('Fr')}
          {language('En')}
        </SimpleGrid>
        <FormError state={state} />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={onSave} loading={pending} disabled={!complete}>
            {t('save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

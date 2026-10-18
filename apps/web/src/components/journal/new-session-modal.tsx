'use client';

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import { IconCalendar } from '@tabler/icons-react';
import type { CustomEventType, Journal, PlannableType } from '@tiralarc/api-client';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { planSession } from '@/app/actions/coaching';
import { createSession } from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import { CustomTypeModal } from './custom-type-modal';
import { type TypeChoice, TypePicker } from './type-picker';

export interface NewSessionDefaults {
  date: string;
}

/**
 * Step 1 of the two-step entry: type + date. Full screen on phones. On success the
 * server action redirects to the event's own form, whose fields depend on the type.
 */
export function NewSessionModal({
  journal,
  customTypes,
  defaults,
  onClose,
  coachOf,
}: {
  journal: Journal;
  /** The archer's own event types, offered after the built-in ones. */
  customTypes: CustomEventType[];
  /** null = closed */
  defaults: NewSessionDefaults | null;
  onClose: () => void;
  /**
   * The archer whose journal it is, when their coach plans an event: the built-in types only,
   * on a day after today.
   */
  coachOf?: string;
}) {
  const t = useTranslations();
  const isPhone = useMediaQuery('(max-width: 48em)');
  /** The custom type being defined or changed, in a dialog over this one. */
  const [editingType, setEditingType] = useState<CustomEventType | 'new' | null>(null);

  return (
    <Modal
      opened={defaults !== null}
      onClose={onClose}
      title={<Text fw={600}>{t(coachOf ? 'coach.planSession' : 'journal.newSession')}</Text>}
      fullScreen={isPhone}
      size="lg"
      centered
      // Escape closes the dialog on top only.
      closeOnEscape={editingType === null}
    >
      {/* Remount on each opening so the form starts from the clicked day. */}
      {defaults && (
        <NewSessionForm
          key={defaults.date}
          journal={journal}
          customTypes={customTypes}
          defaults={defaults}
          editingType={editingType}
          onEditType={setEditingType}
          onCancel={onClose}
          coachOf={coachOf}
        />
      )}
    </Modal>
  );
}

function NewSessionForm({
  journal,
  customTypes,
  defaults,
  editingType,
  onEditType,
  onCancel,
  coachOf,
}: {
  journal: Journal;
  customTypes: CustomEventType[];
  defaults: NewSessionDefaults;
  editingType: CustomEventType | 'new' | null;
  onEditType: (type: CustomEventType | 'new' | null) => void;
  onCancel: () => void;
  coachOf?: string;
}) {
  const t = useTranslations('journal');
  const tCoach = useTranslations('coach');
  // A coach plans from tomorrow on.
  const firstDay = coachOf ? laterOf(journal.startDate, tomorrow()) : journal.startDate;
  const [picked, setPicked] = useState<TypeChoice | null>(null);
  const [date, setDate] = useState<string | null>(
    laterOf(clampToJournal(defaults.date, journal), firstDay),
  );
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  // A custom type deleted meanwhile is no longer a choice.
  const choice =
    picked?.customTypeId && !customTypes.some((c) => c.id === picked.customTypeId) ? null : picked;

  const submit = () => {
    if (!choice || !date) return;
    startTransition(async () => {
      if (!coachOf) return setState(await createSession({ ...choice, date }));
      // The type picker offers a coach the plannable types only.
      const type = choice.type as PlannableType;
      setState(await planSession(coachOf, { type, date }));
    });
  };

  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        {coachOf ? tCoach('planSessionHint') : t('newSessionHint')}
      </Text>
      {coachOf ? (
        <TypePicker value={choice} onChange={setPicked} />
      ) : (
        <>
          <TypePicker
            value={choice}
            onChange={setPicked}
            customTypes={customTypes}
            onAdd={() => onEditType('new')}
            onEdit={onEditType}
          />
          <CustomTypeModal
            editing={editingType}
            customTypes={customTypes}
            onClose={() => onEditType(null)}
            onSaved={(customTypeId) => {
              // A new (or just changed) type is the one the archer wants.
              setPicked({ type: 'CUSTOM', customTypeId });
              onEditType(null);
            }}
          />
        </>
      )}
      <DatePickerInput
        label={t('date')}
        value={date}
        onChange={setDate}
        minDate={firstDay}
        maxDate={journal.endDate}
        valueFormat="dddd D MMMM YYYY"
        leftSection={<IconCalendar size={18} />}
        required
        maw={{ xs: 320 }}
      />
      <FormError state={state} />
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button onClick={submit} loading={pending} disabled={!choice || !date}>
          {t('create')}
        </Button>
      </Group>
    </Stack>
  );
}

export const today = () => dayjs().format('YYYY-MM-DD');
export const tomorrow = () => dayjs().add(1, 'day').format('YYYY-MM-DD');

/** The later of two days (YYYY-MM-DD strings compare chronologically). */
const laterOf = (a: string, b: string) => (a > b ? a : b);

/** The closest day within the journal's period (YYYY-MM-DD strings compare chronologically). */
export function clampToJournal(day: string, journal: Journal): string {
  if (day < journal.startDate) return journal.startDate;
  return day > journal.endDate ? journal.endDate : day;
}

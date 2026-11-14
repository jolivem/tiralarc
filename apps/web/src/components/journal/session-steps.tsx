'use client';

import {
  ActionIcon,
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  UnstyledButton,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { JournalSession } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import classes from './journal.module.css';

export type SessionStep = JournalSession['steps'][number];
type StepUnit = SessionStep['unit'];
type StepTarget = NonNullable<SessionStep['target']>;

const UNITS: StepUnit[] = ['MINUTES', 'ARROWS'];
const TARGETS: StepTarget[] = ['STRAW', 'VISUAL', 'FACE'];
/** As many as the API takes. */
export const MAX_STEPS = 20;

const EMPTY: SessionStep = { unit: 'MINUTES', amount: null, target: null, description: '' };

/** "15 min · Paille — Échauffement": a step written on one line of the sheet (or more). */
export function useStepLabel() {
  const t = useTranslations('journal.steps');
  return (step: SessionStep) =>
    [
      [
        step.amount !== null &&
          t(step.unit === 'MINUTES' ? 'minutes' : 'arrows', { count: step.amount }),
        step.target && t(`targets.${step.target}`),
      ]
        .filter(Boolean)
        .join(' · '),
      step.description,
    ]
      .filter(Boolean)
      .join(' — ');
}

/** The "+" next to the "Déroulé de la séance" title: a new step. */
export function AddStepButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const t = useTranslations('journal.steps');
  return (
    <ActionIcon
      variant="light"
      size="sm"
      radius="xl"
      onClick={onClick}
      disabled={disabled}
      aria-label={t('add')}
      title={t('add')}
    >
      <IconPlus size={14} />
    </ActionIcon>
  );
}

/**
 * The session's steps, one per ruled line (a long one goes on over the next lines), in order.
 * A click on one opens it in the step dialog, unless `readOnly`.
 */
export function StepList({
  steps,
  onOpen,
  readOnly,
}: {
  steps: SessionStep[];
  onOpen: (index: number) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations('journal.steps');
  const label = useStepLabel();
  if (steps.length === 0) {
    return (
      <p className={`${classes.ruledText} ${classes.stepsEmpty}`}>{readOnly ? '' : t('empty')}</p>
    );
  }
  return (
    <ol className={`${classes.ruledText} ${classes.steps}`}>
      {steps.map((step, i) => (
        // Steps have no id: their place in the list is theirs.
        <li key={i}>
          {readOnly ? (
            label(step)
          ) : (
            <UnstyledButton
              className={classes.stepButton}
              onClick={() => onOpen(i)}
              title={t('edit')}
            >
              {label(step)}
            </UnstyledButton>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * Adds a step (`step` undefined) or changes one: minutes or arrows and how many, what is shot
 * at (straw boss, sighting mark, target face; optional) and what to do. Only the sheet changes:
 * it is saved with the sheet.
 */
export function StepDialog({
  opened,
  step,
  onClose,
  onSave,
  onDelete,
}: {
  opened: boolean;
  /** The step being changed; undefined for a new one. */
  step?: SessionStep;
  onClose: () => void;
  onSave: (step: SessionStep) => void;
  /** Takes the step off (offered for an existing step only). */
  onDelete: () => void;
}) {
  const t = useTranslations('journal.steps');
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>{t(step ? 'editTitle' : 'newTitle')}</Text>}
      centered
    >
      {/* Remounted on each opening: the form starts from the step shown. */}
      {opened && (
        <StepFields
          initial={step ?? EMPTY}
          isNew={!step}
          onSave={onSave}
          onCancel={onClose}
          onDelete={onDelete}
        />
      )}
    </Modal>
  );
}

function StepFields({
  initial,
  isNew,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: SessionStep;
  isNew: boolean;
  onSave: (step: SessionStep) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('journal.steps');
  const [step, setStep] = useState(initial);
  const set = <K extends keyof SessionStep>(key: K, value: SessionStep[K]) =>
    setStep((s) => ({ ...s, [key]: value }));
  // Something to say: how long, or what to do.
  const ready = step.amount !== null || step.description.trim() !== '';

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {t('measure')}
        </Text>
        <SegmentedControl
          fullWidth
          value={step.unit}
          onChange={(v) => set('unit', v as StepUnit)}
          data={UNITS.map((unit) => ({ value: unit, label: t(`units.${unit}`) }))}
        />
      </Stack>
      <NumberInput
        label={t(step.unit === 'MINUTES' ? 'durationLabel' : 'arrowsLabel')}
        min={1}
        max={999}
        allowDecimal={false}
        allowNegative={false}
        value={step.amount ?? ''}
        onChange={(v) => set('amount', typeof v === 'number' ? v : null)}
      />
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {t('target')}
        </Text>
        {/* One at most; a second click on the chosen one takes it off. */}
        <Group gap="xs" grow>
          {TARGETS.map((target) => (
            <Button
              key={target}
              variant={step.target === target ? 'filled' : 'default'}
              aria-pressed={step.target === target}
              onClick={() => set('target', step.target === target ? null : target)}
            >
              {t(`targets.${target}`)}
            </Button>
          ))}
        </Group>
      </Stack>
      <Textarea
        label={t('description')}
        placeholder={t('descriptionPlaceholder')}
        value={step.description}
        onChange={(e) => set('description', e.currentTarget.value)}
        autosize
        minRows={3}
        maxLength={1000}
      />
      <Group justify="space-between">
        {!isNew ? (
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={onDelete}
          >
            {t('delete')}
          </Button>
        ) : (
          <span />
        )}
        <Group gap="xs">
          <Button variant="default" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => onSave({ ...step, description: step.description.trim() })}
            disabled={!ready}
          >
            {t(isNew ? 'addConfirm' : 'save')}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

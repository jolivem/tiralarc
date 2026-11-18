'use client';

import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  UnstyledButton,
} from '@mantine/core';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import type { JournalSession } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import classes from './journal.module.css';

export type SessionStep = JournalSession['steps'][number];
type StepUnit = SessionStep['unit'];
type StepTarget = NonNullable<SessionStep['target']>;

const UNITS: StepUnit[] = ['MINUTES', 'ARROWS'];
const TARGETS: StepTarget[] = ['STRAW', 'VISUAL', 'FACE'];
/** As many as the API takes. */
export const MAX_STEPS = 20;

const EMPTY: SessionStep = {
  unit: 'MINUTES',
  amount: null,
  target: null,
  description: '',
  done: false,
};

/** "15 min · Paille — Échauffement": a step written on one line of the sheet (or more). */
export function useStepLabel() {
  const t = useTranslations('journal.steps');
  // Stable: the share dialog's rows are memoised on it.
  return useCallback(
    (step: SessionStep) =>
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
        .join(' — '),
    [t],
  );
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

/** The steps' planned minutes and arrows, added up (steps without an amount left out). */
export function stepTotals(steps: SessionStep[]): { minutes: number; arrows: number } {
  let minutes = 0;
  let arrows = 0;
  for (const step of steps) {
    if (step.amount === null) continue;
    if (step.unit === 'MINUTES') minutes += step.amount;
    else arrows += step.amount;
  }
  return { minutes, arrows };
}

/** "45 min · 72 flèches": the steps' total, worded; '' when none has an amount. */
export function useStepsTotal() {
  const t = useTranslations('journal.steps');
  return (steps: SessionStep[]) => {
    const { minutes, arrows } = stepTotals(steps);
    return [
      minutes > 0 && t('minutes', { count: minutes }),
      arrows > 0 && t('arrows', { count: arrows }),
    ]
      .filter(Boolean)
      .join(' · ');
  };
}

/** `steps` with the one at `index` moved by `by` places (-1 up, 1 down); unchanged at an end. */
export function moveStep(steps: SessionStep[], index: number, by: -1 | 1): SessionStep[] {
  const target = index + by;
  if (target < 0 || target >= steps.length) return steps;
  const moved = [...steps];
  [moved[index], moved[target]] = [moved[target]!, moved[index]!];
  return moved;
}

/**
 * The session's steps, one per ruled line (a long one goes on over the next lines), in order
 * (their total is by the box's title: `useStepsTotal`). Unless `readOnly`: a click on one opens it in the step
 * dialog, arrows move it up or down. With `onToggle` (the archer, once the day has come), a box
 * before each step ticks it as done; a ticked one shows so to anyone.
 */
export function StepList({
  steps,
  onOpen,
  onChange,
  onToggle,
  readOnly,
}: {
  steps: SessionStep[];
  onOpen: (index: number) => void;
  /** The steps in their new order. */
  onChange: (steps: SessionStep[]) => void;
  /** Ticks (or unticks) the step at that index. */
  onToggle?: (index: number) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations('journal.steps');
  const label = useStepLabel();
  if (steps.length === 0) {
    return (
      <p className={`${classes.ruledText} ${classes.stepsEmpty}`}>{readOnly ? '' : t('empty')}</p>
    );
  }
  /** An arrow moving the step at `i`; only where it can (none up for the first, down for the last). */
  const move = (i: number, by: -1 | 1) => {
    const hint = t(by < 0 ? 'moveUp' : 'moveDown', { step: i + 1 });
    if (i + by < 0 || i + by >= steps.length) {
      // Its place kept, empty: the numbers stay in line.
      return <span className={classes.stepMoveBlank} aria-hidden />;
    }
    const Icon = by < 0 ? IconChevronUp : IconChevronDown;
    return (
      <ActionIcon
        variant="subtle"
        color="gray"
        size="xs"
        onClick={() => onChange(moveStep(steps, i, by))}
        aria-label={hint}
        title={hint}
      >
        <Icon size={14} />
      </ActionIcon>
    );
  };

  return (
    <>
      <ol className={`${classes.ruledText} ${classes.steps}`}>
        {steps.map((step, i) => (
          // Steps have no id: their place in the list is theirs.
          <li key={i} className={classes.stepItem}>
            {/* Before the number: the arrows that can move it (not for a coach who only reads). */}
            {!readOnly && steps.length > 1 && (
              <span className={classes.stepMoves}>
                {move(i, -1)}
                {move(i, 1)}
              </span>
            )}
            <span className={classes.stepNumber} aria-hidden>
              {i + 1} –{' '}
            </span>
            {readOnly ? (
              <span className={classes.stepText}>{label(step)}</span>
            ) : (
              <UnstyledButton
                className={`${classes.stepButton} ${classes.stepText}`}
                onClick={() => onOpen(i)}
                title={t('edit')}
              >
                {label(step)}
              </UnstyledButton>
            )}
            {/* Right of the step: its box (a green tick once done), or the tick alone. */}
            {onToggle ? (
              <Checkbox
                size="xs"
                color="green"
                className={classes.stepCheck}
                checked={step.done === true}
                onChange={() => onToggle(i)}
                aria-label={t('done', { step: i + 1 })}
              />
            ) : (
              step.done && (
                <IconCheck
                  size={18}
                  stroke={2.5}
                  className={classes.stepCheck}
                  aria-label={t('doneMark')}
                />
              )
            )}
          </li>
        ))}
      </ol>
    </>
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

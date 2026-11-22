'use client';

import {
  ActionIcon,
  Button,
  Checkbox,
  Chip,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import type { StrengthStep } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import journal from '@/components/journal/journal.module.css';
import {
  durationLabel,
  exerciseById,
  MAX_STRENGTH_STEPS,
  MEASURES,
  moveItem,
  STRENGTH_EXERCISES,
  STRENGTH_LOADS,
  STRENGTH_ZONES,
  type ExerciseId,
  type StrengthLoad,
  type StrengthZone,
  stepFor,
  SUGGESTIONS,
  volumeLabel,
} from '@/lib/strength';
import { ExerciseFigure } from './exercise-figure';
import classes from './strength.module.css';

/** "Gainage face — 3 × 30 s · poids du corps · repos 45 s": a step on one line of the sheet. */
export function useStrengthLabel() {
  const t = useTranslations('strength');
  const load = (step: StrengthStep) =>
    step.load === 'KG' ? t('kg', { kg: step.loadKg ?? 0 }) : t(`loads.${step.load}`);
  return (step: StrengthStep) =>
    [
      step.name,
      [
        volumeLabel(step),
        load(step),
        step.restSeconds !== null && t('restShort', { rest: durationLabel(step.restSeconds) }),
        step.note,
      ]
        .filter(Boolean)
        .join(' · '),
    ].join(' — ');
}

/**
 * A strength programme: its exercises, one per ruled line, in order (arrows move one), and a
 * button opening the guide, which builds an exercise in a few clicks; a click on one opens it
 * there again. With `onToggle` (a STRENGTH event, once its day has come), a box ticks each one
 * as done. `readOnly` (a coach reading it, a locked sheet): listed only. `extra` goes beside the
 * add button (e.g. "Start from a strength sheet").
 */
export function StrengthProgramme({
  steps,
  onChange,
  onToggle,
  readOnly = false,
  extra,
}: {
  steps: StrengthStep[];
  onChange: (steps: StrengthStep[]) => void;
  onToggle?: (index: number) => void;
  readOnly?: boolean;
  extra?: ReactNode;
}) {
  const t = useTranslations('strength');
  const label = useStrengthLabel();
  /** The exercise open in the guide: its index, or a new one. */
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const move = (i: number, by: -1 | 1) => {
    if (i + by < 0 || i + by >= steps.length) {
      return <span className={journal.stepMoveBlank} aria-hidden />;
    }
    const hint = t(by < 0 ? 'moveUp' : 'moveDown', { step: i + 1 });
    const Icon = by < 0 ? IconChevronUp : IconChevronDown;
    return (
      <ActionIcon
        variant="subtle"
        color="gray"
        size="xs"
        onClick={() => onChange(moveItem(steps, i, by))}
        aria-label={hint}
        title={hint}
      >
        <Icon size={14} />
      </ActionIcon>
    );
  };

  return (
    <Stack gap={0}>
      {steps.length === 0 ? (
        <p className={`${journal.ruledText} ${journal.stepsEmpty}`}>{readOnly ? '' : t('empty')}</p>
      ) : (
        <ol className={`${journal.ruledText} ${journal.steps}`}>
          {steps.map((step, i) => (
            // Steps have no id: their place in the list is theirs. Two ruled lines each: the
            // exercise's drawing in its frame, then its line of text.
            <li key={i} className={`${journal.stepItem} ${classes.item}`}>
              {!readOnly && steps.length > 1 && (
                <span className={journal.stepMoves}>
                  {move(i, -1)}
                  {move(i, 1)}
                </span>
              )}
              {/* A fixed width: the frames line up, whatever the number's width. */}
              <span className={`${journal.stepNumber} ${classes.itemNumber}`} aria-hidden>
                {i + 1} –
              </span>
              {/* A catalogue exercise's drawing, with its load (an empty frame for one typed). */}
              <span className={classes.figureFrame} aria-hidden>
                {exerciseById(step.exercise) && (
                  <ExerciseFigure
                    exercise={exerciseById(step.exercise)!.id}
                    load={step.load}
                    size={68}
                  />
                )}
              </span>
              {readOnly ? (
                <span className={`${journal.stepText} ${classes.itemText}`}>{label(step)}</span>
              ) : (
                <UnstyledButton
                  className={`${journal.stepButton} ${journal.stepText} ${classes.itemText}`}
                  onClick={() => setEditing(i)}
                  title={t('edit')}
                >
                  {label(step)}
                </UnstyledButton>
              )}
              {onToggle ? (
                <Checkbox
                  size="xs"
                  color="green"
                  className={journal.stepCheck}
                  checked={step.done === true}
                  onChange={() => onToggle(i)}
                  aria-label={t('done', { step: i + 1 })}
                />
              ) : (
                step.done && (
                  <IconCheck
                    size={18}
                    stroke={2.5}
                    className={journal.stepCheck}
                    aria-label={t('doneMark')}
                  />
                )
              )}
            </li>
          ))}
        </ol>
      )}
      {!readOnly && (
        <Group gap="sm" mt={4} h="var(--step, 30px)" align="center">
          <Button
            variant="light"
            size="compact-sm"
            leftSection={<IconPlus size={16} />}
            onClick={() => setEditing('new')}
            disabled={steps.length >= MAX_STRENGTH_STEPS}
            data-tour="strength-add"
          >
            {t('add')}
          </Button>
          {extra}
        </Group>
      )}
      {editing !== null && (
        <StrengthGuide
          step={editing === 'new' ? null : steps[editing]!}
          onClose={() => setEditing(null)}
          onSave={(step) => {
            onChange(
              editing === 'new'
                ? [...steps, step]
                : steps.map((s, i) => (i === editing ? step : s)),
            );
            setEditing(null);
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : () => {
                  onChange(steps.filter((_, i) => i !== editing));
                  setEditing(null);
                }
          }
        />
      )}
    </Stack>
  );
}

/**
 * "How to do it": the exercise's drawing (equipped for the load chosen) in its frame, what it
 * consists of, and the tips to do it well (`strength.howTo.<id>`, one tip a line).
 */
function HowTo({ exercise, load }: { exercise: ExerciseId; load: StrengthLoad }) {
  const t = useTranslations('strength');
  return (
    <Paper withBorder p="sm" radius="md" className={classes.howTo}>
      <Group gap="md" wrap="nowrap" align="flex-start">
        <span className={classes.howToFigure}>
          <ExerciseFigure exercise={exercise} load={load} size={128} />
        </span>
        <Stack gap={6} miw={0}>
          <Text size="sm" fw={700}>
            {t('howToTitle')} · {t(`exercises.${exercise}`)}
          </Text>
          <Text size="sm">{t(`howTo.${exercise}.description`)}</Text>
          <Text size="xs" fw={600} c="dimmed">
            {t('tipsTitle')}
          </Text>
          <ul className={classes.tips}>
            {t(`howTo.${exercise}.tips`)
              .split('\n')
              .map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
          </ul>
        </Stack>
      </Group>
    </Paper>
  );
}

/** A row of one-click choices, and a field for any other value. */
function Choices({
  label,
  values,
  value,
  format,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  values: readonly number[];
  value: number | null;
  format: (value: number) => string;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      <Group gap={6} align="center">
        {values.map((v) => (
          <Chip
            key={v}
            size="sm"
            checked={value === v}
            onChange={() => onChange(v)}
            variant="outline"
          >
            {format(v)}
          </Chip>
        ))}
        <NumberInput
          size="xs"
          w={90}
          aria-label={label}
          value={value ?? ''}
          onChange={(v) => typeof v === 'number' && onChange(v)}
          min={min}
          max={max}
          step={step}
          decimalScale={step < 1 ? 1 : 0}
          suffix={suffix}
          allowNegative={false}
        />
      </Group>
    </Stack>
  );
}

/**
 * The guide: an exercise built in a few clicks — the exercise (by area, or typed), the sets,
 * repetitions or a duration, the load, the rest between sets, a note —, each with suggestions,
 * the result written out as it will read on the sheet.
 */
function StrengthGuide({
  step: initial,
  onSave,
  onDelete,
  onClose,
}: {
  step: StrengthStep | null;
  onSave: (step: StrengthStep) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('strength');
  const label = useStrengthLabel();
  const [step, setStep] = useState<StrengthStep | null>(initial);
  const [zone, setZone] = useState<StrengthZone>(
    exerciseById(initial?.exercise ?? null)?.zone ?? 'CORE',
  );
  const [custom, setCustom] = useState(initial && !initial.exercise ? initial.name : '');
  const set = <K extends keyof StrengthStep>(key: K, value: StrengthStep[K]) =>
    setStep((s) => (s ? { ...s, [key]: value } : s));

  /**
   * An exercise of the catalogue: a new one comes with its usual figures; one being edited keeps
   * the figures already chosen.
   */
  const pick = (id: string) => {
    const exercise = exerciseById(id)!;
    const name = t(`exercises.${exercise.id}`);
    setCustom('');
    setStep((s) =>
      initial && s ? { ...s, exercise: exercise.id, name } : stepFor(exercise, name),
    );
  };
  /** An exercise the archer types: the figures stay as they are (or a usual start). */
  const typeName = (name: string) => {
    setCustom(name);
    setStep((s) =>
      s
        ? { ...s, exercise: null, name }
        : {
            exercise: null,
            name,
            sets: 3,
            measure: 'REPS',
            amount: 10,
            load: 'BODYWEIGHT',
            loadKg: null,
            restSeconds: 60,
            note: '',
            done: false,
          },
    );
  };
  const valid = step !== null && step.name.trim() !== '';

  return (
    <Modal
      opened
      onClose={onClose}
      size="lg"
      title={<Text fw={600}>{initial ? t('editTitle') : t('newTitle')}</Text>}
      centered
    >
      <Stack gap="md">
        {/* 1. The exercise: an area, then one of its exercises; or one typed. */}
        <Stack gap={6}>
          <Text size="sm" fw={600}>
            {t('exercise')}
          </Text>
          <ScrollArea type="auto" offsetScrollbars>
            <SegmentedControl
              size="xs"
              value={zone}
              onChange={(value) => setZone(value as StrengthZone)}
              data={STRENGTH_ZONES.map((z) => ({ value: z, label: t(`zones.${z}`) }))}
            />
          </ScrollArea>
          {/* Each exercise as a small card with its drawing (its usual equipment). */}
          <div className={classes.exercises}>
            {STRENGTH_EXERCISES.filter((exercise) => exercise.zone === zone).map((exercise) => (
              <UnstyledButton
                key={exercise.id}
                className={classes.exercise}
                data-selected={step?.exercise === exercise.id || undefined}
                aria-pressed={step?.exercise === exercise.id}
                onClick={() => pick(exercise.id)}
              >
                <ExerciseFigure exercise={exercise.id} load={exercise.load} size={72} />
                <span>{t(`exercises.${exercise.id}`)}</span>
              </UnstyledButton>
            ))}
          </div>
          <TextInput
            size="xs"
            placeholder={t('otherExercise')}
            aria-label={t('otherExercise')}
            value={custom}
            onChange={(event) => typeName(event.currentTarget.value)}
            maxLength={120}
          />
        </Stack>

        {/* A catalogue exercise: how to do it, drawn with the load chosen. */}
        {step && exerciseById(step.exercise) && (
          <HowTo exercise={exerciseById(step.exercise)!.id} load={step.load} />
        )}

        {step && (
          <>
            <Choices
              label={t('sets')}
              values={SUGGESTIONS.sets}
              value={step.sets}
              format={String}
              onChange={(v) => set('sets', v)}
              min={1}
              max={20}
            />
            <Stack gap={6}>
              <SegmentedControl
                size="xs"
                w="fit-content"
                value={step.measure}
                onChange={(value) => {
                  const measure = value as StrengthStep['measure'];
                  setStep((s) =>
                    s ? { ...s, measure, amount: measure === 'SECONDS' ? 30 : 10 } : s,
                  );
                }}
                data={MEASURES.map((m) => ({ value: m, label: t(`measures.${m}`) }))}
              />
              <Choices
                label={step.measure === 'SECONDS' ? t('duration') : t('reps')}
                values={SUGGESTIONS[step.measure]}
                value={step.amount}
                format={step.measure === 'SECONDS' ? durationLabel : String}
                onChange={(v) => set('amount', v)}
                min={1}
                max={step.measure === 'SECONDS' ? 3600 : 999}
                suffix={step.measure === 'SECONDS' ? ' s' : undefined}
              />
            </Stack>
            <Stack gap={6}>
              <Text size="sm" fw={600}>
                {t('load')}
              </Text>
              <Group gap={6}>
                {STRENGTH_LOADS.map((load: StrengthLoad) => (
                  <Chip
                    key={load}
                    size="sm"
                    checked={step.load === load}
                    onChange={() =>
                      setStep((s) =>
                        s ? { ...s, load, loadKg: load === 'KG' ? (s.loadKg ?? 5) : null } : s,
                      )
                    }
                  >
                    {t(`loads.${load}`)}
                  </Chip>
                ))}
              </Group>
              {step.load === 'KG' && (
                <Choices
                  label={t('weight')}
                  values={SUGGESTIONS.kg}
                  value={step.loadKg}
                  format={(kg) => t('kg', { kg })}
                  onChange={(v) => set('loadKg', v)}
                  min={0.5}
                  max={500}
                  step={0.5}
                  suffix=" kg"
                />
              )}
            </Stack>
            <Stack gap={6}>
              <Choices
                label={t('rest')}
                values={SUGGESTIONS.rest}
                value={step.restSeconds}
                format={durationLabel}
                onChange={(v) => set('restSeconds', v)}
                min={0}
                max={900}
                suffix=" s"
              />
              <Chip
                size="xs"
                variant="light"
                checked={step.restSeconds === null}
                onChange={() => set('restSeconds', null)}
              >
                {t('noRest')}
              </Chip>
            </Stack>
            <TextInput
              label={t('note')}
              value={step.note ?? ''}
              onChange={(event) => set('note', event.currentTarget.value)}
              maxLength={300}
            />
            {/* As it will read on the sheet. */}
            <Paper withBorder p="sm" radius="sm" className={classes.summary}>
              <Text size="xs" c="dimmed">
                {t('summary')}
              </Text>
              <Text fw={600}>{valid ? label(step) : '—'}</Text>
            </Paper>
          </>
        )}

        <Group justify="space-between">
          {onDelete ? (
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
          <Group gap="sm">
            <Button variant="default" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button onClick={() => step && onSave(step)} disabled={!valid}>
              {initial ? t('save') : t('addOne')}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

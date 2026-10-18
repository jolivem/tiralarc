'use client';

import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Modal,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconBarbell,
  IconBow,
  IconCalendar,
  IconPencil,
  IconPlant2,
  IconPlus,
  IconTargetArrow,
  IconTrash,
} from '@tabler/icons-react';
import type { Goal, GoalType } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { type CSSProperties, useOptimistic, useState, useTransition } from 'react';
import { createGoal, deleteGoal, updateGoal } from '@/app/actions/goals';
import { FormError, useFieldError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import { SquaredCard, StatsCardTitle } from './stats-cards';
import classes from './stats.module.css';

const GOAL_TYPES: GoalType[] = ['SPORT', 'TECHNIQUE', 'PHYSICAL', 'PERSONAL'];
/** Each category's stamp (top right of its box). */
const TYPE_ICONS: Record<GoalType, typeof IconPlus> = {
  SPORT: IconTargetArrow,
  TECHNIQUE: IconBow,
  PHYSICAL: IconBarbell,
  PERSONAL: IconPlant2,
};
const TYPE_COLORS: Record<GoalType, string> = {
  SPORT: 'orange',
  TECHNIQUE: 'blue',
  PHYSICAL: 'grape',
  PERSONAL: 'teal',
};

/**
 * The archer's goals: how many are reached, then the list — ticking a goal
 * marks it reached today; the pencil edits everything, dates included.
 * `readOnly`: the archer's coach sees them, without changing anything.
 */
export function GoalsCard({
  goals,
  today,
  readOnly = false,
}: {
  goals: Goal[];
  today: string;
  readOnly?: boolean;
}) {
  const t = useTranslations('goals');
  const format = useFormatter();
  const isPhone = useMediaQuery('(max-width: 48em)');
  // null = closed, 'new' = creating, otherwise the goal being edited.
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Goal | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [deleting, startDeleting] = useTransition();
  const [, startToggling] = useTransition();
  // Ticking a goal answers at once; the server's order and dates follow.
  const [shown, toggleShown] = useOptimistic(goals, (current, id: string) =>
    current.map((goal) =>
      goal.id === id
        ? { ...goal, achieved: !goal.achieved, achievedOn: goal.achieved ? null : today }
        : goal,
    ),
  );

  const reached = shown.filter((goal) => goal.achieved).length;
  // Noon, so the calendar day is the same in every time zone.
  const day = (date: string) =>
    format.dateTime(new Date(`${date}T12:00:00`), { dateStyle: 'medium' });
  const toggle = (goal: Goal) =>
    startToggling(async () => {
      toggleShown(goal.id);
      setState(await updateGoal(goal.id, { achievedOn: goal.achieved ? null : today }));
    });
  const closeDelete = () => {
    setToDelete(null);
    setState({});
  };

  return (
    <SquaredCard>
      <Stack gap="md">
        {/* The title, the progress over all goals in the middle, the "+" on the right. */}
        <Group justify="space-between" align="center" gap="md">
          <StatsCardTitle>{t('title')}</StatsCardTitle>
          {shown.length > 0 && (
            <Stack gap={4} align="center" className={classes.goalsProgress}>
              <Group gap={6} align="baseline" justify="center" wrap="nowrap">
                <Text className={classes.figure}>
                  {reached} / {shown.length}
                </Text>
                <Text size="sm" c="dimmed">
                  {t('reached', { count: shown.length })}
                </Text>
              </Group>
              <Progress
                w="100%"
                value={(reached / shown.length) * 100}
                aria-label={t('progress', { reached, total: shown.length })}
              />
            </Stack>
          )}
          {!readOnly && (
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={16} />}
              onClick={() => setEditing('new')}
            >
              {t('add')}
            </Button>
          )}
        </Group>

        {shown.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t('empty')}
          </Text>
        ) : (
          // One box per category, each with its own goals.
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {GOAL_TYPES.map((type) => {
              const goals = shown.filter((goal) => goal.type === type);
              const TypeIcon = TYPE_ICONS[type];
              return (
                <section
                  key={type}
                  className={classes.goalGroup}
                  style={
                    {
                      '--goal-color': `var(--mantine-color-${TYPE_COLORS[type]}-6)`,
                    } as CSSProperties
                  }
                >
                  {/* The category's stamp, inked in the top right corner. */}
                  <span className={classes.goalStamp} aria-hidden>
                    <TypeIcon size={22} stroke={1.8} />
                  </span>
                  {/* The name on the left, the count on the right, just left of the stamp. */}
                  <Group
                    justify="space-between"
                    gap="xs"
                    align="baseline"
                    wrap="nowrap"
                    mb={4}
                    pr={48}
                  >
                    {/* In the calligraphy font chosen on the Profile page, like the card's title. */}
                    <Text
                      component="h3"
                      ff="var(--font-calendar, var(--font-hand)), 'Segoe Print', cursive"
                      fz="1.4rem"
                      fw={700}
                      lh={1.2}
                      c={TYPE_COLORS[type]}
                      m={0}
                    >
                      {t(`types.${type}`)}
                    </Text>
                    {goals.length > 0 && (
                      <Text size="xs" c="dimmed">
                        {goals.filter((goal) => goal.achieved).length} / {goals.length}
                      </Text>
                    )}
                  </Group>
                  {goals.length === 0 ? (
                    <Text size="sm" c="dimmed" fs="italic">
                      {t('emptyType')}
                    </Text>
                  ) : (
                    <Stack gap={0} component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
                      {goals.map((goal) => (
                        <Group
                          key={goal.id}
                          component="li"
                          gap="sm"
                          wrap="nowrap"
                          align="flex-start"
                          py={6}
                        >
                          <Checkbox
                            mt={2}
                            color={TYPE_COLORS[type]}
                            checked={goal.achieved}
                            onChange={() => !readOnly && toggle(goal)}
                            readOnly={readOnly}
                            aria-label={t(goal.achieved ? 'markOpen' : 'markReached', {
                              goal: goal.description,
                            })}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              size="sm"
                              td={goal.achieved ? 'line-through' : undefined}
                              c={goal.achieved ? 'dimmed' : undefined}
                              style={{ overflowWrap: 'anywhere' }}
                            >
                              {goal.description}
                            </Text>
                            {/* The day it was reached (not the day it was set). */}
                            {goal.achievedOn && (
                              <Text size="xs" c="dimmed" mt={2}>
                                {t('dateReached', { reached: day(goal.achievedOn) })}
                              </Text>
                            )}
                          </div>
                          {!readOnly && (
                            <Group gap={0} wrap="nowrap">
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                aria-label={t('editLabel', { goal: goal.description })}
                                onClick={() => setEditing(goal)}
                              >
                                <IconPencil size={18} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                aria-label={t('deleteLabel', { goal: goal.description })}
                                onClick={() => setToDelete(goal)}
                              >
                                <IconTrash size={18} />
                              </ActionIcon>
                            </Group>
                          )}
                        </Group>
                      ))}
                    </Stack>
                  )}
                </section>
              );
            })}
          </SimpleGrid>
        )}
        {toDelete === null && <FormError state={state} />}
      </Stack>

      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={<Text fw={600}>{t(editing === 'new' ? 'add' : 'edit')}</Text>}
        fullScreen={isPhone}
        centered
      >
        {/* Mounted on each opening so the form starts from the goal (or blank). */}
        {editing !== null && (
          <GoalForm
            goal={editing === 'new' ? undefined : editing}
            today={today}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        opened={toDelete !== null}
        onClose={closeDelete}
        title={<Text fw={600}>{t('deleteTitle')}</Text>}
        centered
      >
        {toDelete && (
          <Stack>
            <Text size="sm">{t('deleteBody', { goal: toDelete.description })}</Text>
            <FormError state={state} />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeDelete}>
                {t('cancel')}
              </Button>
              <Button
                color="red"
                loading={deleting}
                onClick={() =>
                  startDeleting(async () => {
                    const result = await deleteGoal(toDelete.id);
                    if (result.code) setState(result);
                    else closeDelete();
                  })
                }
              >
                {t('delete')}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </SquaredCard>
  );
}

function GoalForm({ goal, today, onDone }: { goal?: Goal; today: string; onDone: () => void }) {
  const t = useTranslations('goals');
  const fieldError = useFieldError();
  const [type, setType] = useState<GoalType | null>(goal?.type ?? null);
  const [description, setDescription] = useState(goal?.description ?? '');
  const [createdOn, setCreatedOn] = useState<string | null>(goal?.createdOn ?? today);
  const [achieved, setAchieved] = useState(goal?.achieved ?? false);
  const [achievedOn, setAchievedOn] = useState<string | null>(goal?.achievedOn ?? null);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const valid =
    type !== null &&
    description.trim() !== '' &&
    createdOn !== null &&
    (!achieved || achievedOn !== null);
  const submit = () => {
    if (!type || !createdOn || !valid) return;
    startTransition(async () => {
      const values = {
        type,
        description: description.trim(),
        createdOn,
        achievedOn: achieved ? achievedOn : null,
      };
      const result = goal ? await updateGoal(goal.id, values) : await createGoal(values);
      if (result.code) setState(result);
      else onDone();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Stack gap="md">
        <Select
          label={t('type')}
          placeholder={t('choose')}
          data={GOAL_TYPES.map((value) => ({ value, label: t(`types.${value}`) }))}
          value={type}
          onChange={(value) => setType(value as GoalType | null)}
          allowDeselect={false}
          error={fieldError(state, 'type')}
          required
        />
        <Textarea
          label={t('description')}
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
          maxLength={500}
          error={fieldError(state, 'description')}
          required
        />
        <DatePickerInput
          label={t('createdOn')}
          value={createdOn}
          onChange={setCreatedOn}
          valueFormat="D MMMM YYYY"
          leftSection={<IconCalendar size={18} />}
          error={fieldError(state, 'createdOn')}
          required
        />
        <Checkbox
          label={t('achieved')}
          checked={achieved}
          onChange={(e) => {
            setAchieved(e.currentTarget.checked);
            // Ticking proposes today; the archer can pick the real day below.
            if (e.currentTarget.checked && !achievedOn) setAchievedOn(today);
          }}
        />
        {achieved && (
          <DatePickerInput
            label={t('achievedOn')}
            value={achievedOn}
            onChange={setAchievedOn}
            minDate={createdOn ?? undefined}
            valueFormat="D MMMM YYYY"
            leftSection={<IconCalendar size={18} />}
            error={fieldError(state, 'achievedOn')}
            required
          />
        )}
        <FormError state={state} />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onDone}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={pending} disabled={!valid}>
            {t(goal ? 'save' : 'create')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

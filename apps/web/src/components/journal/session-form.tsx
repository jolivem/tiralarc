'use client';

import {
  ActionIcon,
  Alert,
  Autocomplete,
  Button,
  Chip,
  CloseButton,
  Group,
  Modal,
  NumberInput,
  Paper,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconDeviceFloppy,
  IconMapPin,
  IconTrash,
  IconTrophy,
} from '@tabler/icons-react';
import type {
  Discipline,
  Feeling,
  JournalSession,
  JournalSessionUpdate,
  JournalSuggestions,
  SessionType,
} from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useEffect, useId, useState, useTransition } from 'react';
import { deletePlannedSession, savePlannedSession } from '@/app/actions/coaching';
import {
  competitionResults,
  deleteSession,
  markSessionSeen,
  saveSession,
} from '@/app/actions/journal';
import { FormError } from '@/components/form-feedback';
import { LooseLeaf } from '@/components/notebook/loose-leaf';
import { RuledStack } from '@/components/notebook/ruled-stack';
import { useRouter } from '@/i18n/navigation';
import type { ActionState } from '@/lib/action-state';
import { ColorPicker, IconPicker } from './event-display';
import { FEELING_INK, FEELINGS } from './feelings';
import classes from './journal.module.css';
import { today, tomorrow } from './new-session-modal';
import { DISCIPLINE_COLORS, DISCIPLINE_ORDER, SESSION_TYPES } from './session-types';

const DEFAULT_NOTE_COLOR = 'gray';
/** The distances offered as one-tap chips (others are typed in the field). */
const QUICK_DISTANCES = [18, 50, 70];
/**
 * Free-text areas written straight on the sheet: no frame, see-through, their lines on the
 * sheet's ruling (journal.module.css, .ruledText).
 */
const RULED_TEXT = {
  variant: 'unstyled',
  classNames: { input: classes.ruledText },
  // Blank: just so CSS can tell an empty field (:placeholder-shown) and draw a pen in it.
  placeholder: ' ',
} as const;
/** Width of the Informations box's number fields (a few digits). */
const NUMBER_WIDTH = 96;
const LIST_LINES = 3;

type Values = Required<Omit<JournalSessionUpdate, 'type' | 'date' | 'wentWell' | 'toImprove'>> & {
  type: SessionType;
  date: string;
  wentWell: string[];
  toImprove: string[];
};

function initialValues(s: JournalSession): Values {
  const pad = (items: string[]) => [...items, '', '', ''].slice(0, LIST_LINES);
  return {
    type: s.type,
    date: s.date,
    durationMinutes: s.durationMinutes,
    location: s.location,
    discipline: s.discipline,
    distanceMeters: s.distanceMeters,
    arrowCount: s.arrowCount,
    score: s.score,
    objective: s.objective,
    satisfaction: s.satisfaction,
    technique: s.technique,
    description: s.description,
    physicalFeeling: s.physicalFeeling,
    mentalFeeling: s.mentalFeeling,
    wentWell: pad(s.wentWell),
    toImprove: pad(s.toImprove),
    nextTime: s.nextTime,
    title: s.title,
    color: s.color,
    icon: s.icon,
  };
}

/** The review (what a future event can't have yet), emptied; the same fields the API checks. */
const NO_REVIEW = {
  arrowCount: null,
  score: null,
  satisfaction: null,
  technique: null,
  description: null,
  physicalFeeling: null,
  mentalFeeling: null,
  wentWell: Array<string>(LIST_LINES).fill(''),
  toImprove: Array<string>(LIST_LINES).fill(''),
  nextTime: null,
} satisfies Partial<Values>;

const hasReview = (v: Values) =>
  [
    v.arrowCount,
    v.score,
    v.satisfaction,
    v.technique,
    v.description,
    v.physicalFeeling,
    v.mentalFeeling,
    v.nextTime,
  ].some((value) => value !== null) || [...v.wentWell, ...v.toImprove].some((line) => line.trim());

/**
 * The lines of a list shown on the sheet: the ones up to the last filled, then one blank to
 * write in (so a new line appears once the one above is filled), `LIST_LINES` at most.
 */
function visibleLines(lines: string[]): string[] {
  const lastFilled = lines.findLastIndex((line) => line.trim() !== '');
  return lines.slice(0, Math.min(lines.length, lastFilled + 2));
}

/**
 * True while the sheet's event is still to come (its review locked): read by what the page
 * puts in the sheet (the photos), which can't tell from the server what "today" is for the user.
 */
export const SheetLockedContext = createContext(false);

/** NumberInput gives '' when emptied. */
const toNumber = (value: string | number) => (typeof value === 'number' ? value : null);
const toText = (value: string) => (value.trim() === '' ? null : value);

/** What a coach may change on an event they planned. */
const planningOf = ({
  date,
  durationMinutes,
  location,
  discipline,
  distanceMeters,
  objective,
}: Values) => ({ date, durationMinutes, location, discipline, distanceMeters, objective });

/** A coach looking at one of their archers' events. */
export interface CoachSheet {
  archerId: string;
  /** An event they planned, still to come, with WRITE access: its planning can change. */
  canEdit: boolean;
  /** The journal's last day: the latest a planned event can move to. */
  lastDay: string;
}

/**
 * Session sheet, mirroring the archer's paper sheet. Events are a day's entry: no time
 * field. Fields are controlled
 * (React resets uncontrolled ones after a server action) and saved with an
 * explicit button. Repetitive fields offer what the archer already typed.
 * With `coach`, the archer's sheet as their coach sees it: read-only, or only its planning
 * (see `CoachSheet.canEdit`).
 */
export function SessionForm({
  session,
  suggestions,
  disciplines,
  title,
  coach,
  children,
}: {
  session: JournalSession;
  suggestions: JournalSuggestions;
  /** The disciplines the archer practises (Profile page): the only ones offered. */
  disciplines: Discipline[];
  /** Top left of the sheet: the event's type and icon (its day, top right, follows the form). */
  title: ReactNode;
  coach?: CoachSheet;
  /** Shown right of the Informations box (the event's photos); below it on small screens. */
  children?: ReactNode;
}) {
  const t = useTranslations('journal');
  const router = useRouter();
  /** A coach who may not change this event: every field shows, none changes. */
  const readOnly = coach !== undefined && !coach.canEdit;
  // The archer now has an event their coach planned in front of them: no longer new (home page).
  const unseenByArcher = !coach && session.plannedBy !== null;
  useEffect(() => {
    if (unseenByArcher) void markSessionSeen(session.id);
  }, [unseenByArcher, session.id]);
  /** Ties the Informations box's names to their fields. */
  const fieldId = useId();
  const [values, setValues] = useState(() => initialValues(session));
  const [saved, setSaved] = useState(() => JSON.stringify(initialValues(session)));
  const [state, setState] = useState<ActionState>({});
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  /** A future day picked for an event with a review, waiting for the archer's go-ahead. */
  const [futureDate, setFutureDate] = useState<string | null>(null);

  const dirty = JSON.stringify(values) !== saved;
  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    if (readOnly) return;
    setState({});
    setValues((v) => ({ ...v, [key]: value }));
  };
  const setLine = (list: 'wentWell' | 'toImprove', index: number, value: string) =>
    set(
      list,
      values[list].map((line, i) => (i === index ? value : line)),
    );

  const save = () =>
    startSaving(async () => {
      const snapshot = values;
      const result = coach
        ? await savePlannedSession(coach.archerId, session.id, planningOf(snapshot))
        : await saveSession(session.id, snapshot);
      setState(result);
      if (!result.code) setSaved(JSON.stringify(snapshot));
    });

  /** Back to the month of the event as saved (unsaved changes are dropped: asked first). */
  const leave = () => {
    const { date } = JSON.parse(saved) as Values;
    const journalPath = coach ? `/coach/${coach.archerId}/journal` : '/archer/journal';
    router.push({ pathname: journalPath, query: { month: date.slice(0, 7) } });
  };
  const close = () => (dirty ? setConfirmLeave(true) : leave());

  const { form } = SESSION_TYPES[values.type];
  const hasSheet = form === 'sheet';
  // An event still to come is planned only (date, duration, place, discipline, distance,
  // objective): its review (everything else) opens on the day itself.
  const locked = hasSheet && values.date > today();
  // The archer's own disciplines (Profile page), plus the event's if it is no longer one
  // of them; all of them when the profile lists none.
  const shownDisciplines = DISCIPLINE_ORDER.filter(
    (d) => disciplines.length === 0 || disciplines.includes(d) || d === values.discipline,
  );

  /** Moving a reviewed session to a future day empties its review: asked first. */
  const changeDate = (date: string) => {
    if (hasSheet && date > today() && hasReview(values)) setFutureDate(date);
    else set('date', date);
  };
  const confirmFutureDate = () => {
    if (!futureDate) return;
    setState({});
    setValues((v) => ({ ...v, ...NO_REVIEW, date: futureDate }));
    setFutureDate(null);
  };

  /*
    Planned by the coach: stamped in the margin until the archer completes it once it has
    taken place (as saved; like the calendar's stamp) — a type without review, until its day.
  */
  const savedValues = JSON.parse(saved) as Values;
  const stamped =
    session.plannedBy !== null && (hasSheet ? !hasReview(savedValues) : savedValues.date > today());
  const stamp = stamped && (
    <span
      className={classes.sheetStamp}
      title={t('plannedBy', { name: session.plannedBy?.name ?? '' })}
    >
      {t('coachStamp')}
    </span>
  );

  // An FFTA competition that has taken place (as saved): its results, once the organiser
  // published them on the FFTA website.
  const fftaId = session.fftaCompetitionId;
  const showsResults = fftaId !== null && savedValues.date < today();
  const [resultsUrl, setResultsUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!showsResults || !fftaId) return;
    let current = true;
    competitionResults(fftaId).then((url) => {
      if (current) setResultsUrl(url);
    });
    return () => {
      current = false;
    };
  }, [showsResults, fftaId]);

  /*
    The type and its icon on the left, written on the second of the sheet's first two lines
    (the date is in the Informations box); an FFTA competition's results on the right, centred
    above the photos (the same two columns as the boxes below).
  */
  const header = (
    <div className={classes.sheetHeader} data-photos={children ? true : undefined}>
      {title}
      {showsResults && (
        <Button
          component="a"
          href={resultsUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          size="md"
          variant="light"
          leftSection={<IconTrophy size={20} />}
          disabled={!resultsUrl}
          title={resultsUrl ? t('resultsHint') : t('resultsPending')}
          className={classes.sheetResults}
        >
          {t('results')}
        </Button>
      )}
    </div>
  );

  const plannedBy = session.plannedBy && (
    <Text size="sm" c="dimmed">
      {t('plannedBy', { name: session.plannedBy.name })}
    </Text>
  );

  // Above the sheet, following the scroll: delete on the left; save, then close on the right.
  // A coach who only reads it gets the close button alone.
  const actionBar = (
    <Paper withBorder shadow="md" p="sm" radius="md" className={classes.actionBar}>
      {/* Wraps on narrow screens. */}
      <Group justify="space-between" gap="sm">
        {readOnly ? (
          (plannedBy ?? (
            <Text size="sm" c="dimmed">
              {t('readOnly')}
            </Text>
          ))
        ) : (
          <Group gap="sm">
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={18} />}
              onClick={() => setConfirmDelete(true)}
            >
              {t('delete')}
            </Button>
            {plannedBy}
          </Group>
        )}
        <Group gap="sm" wrap="nowrap">
          {!readOnly && (
            <>
              <Text size="sm" c={dirty ? 'orange' : 'teal'} visibleFrom="sm">
                {dirty ? t('unsaved') : state.notice === 'saved' ? t('saved') : ''}
              </Text>
              <Button
                leftSection={<IconDeviceFloppy size={18} />}
                onClick={save}
                loading={saving}
                disabled={!dirty}
              >
                {t('save')}
              </Button>
            </>
          )}
          <CloseButton size="lg" aria-label={t('close')} title={t('close')} onClick={close} />
        </Group>
      </Group>
      {state.code && (
        <Stack mt="sm">
          <FormError state={state} />
        </Stack>
      )}
    </Paper>
  );

  // The boxes are written on the loose leaf: each one's name on a ruled line.
  return (
    <Stack gap="sm">
      {actionBar}
      <LooseLeaf margin={stamp}>
        {header}
        {/* A blank line between the title and the first box. */}
        <RuledStack leadingLines={1}>
          {/*
            Informations (its fields in one column) on the left, the photos on its right; the
            whole width when the type takes no photos.
          */}
          <SimpleGrid
            cols={{ base: 1, md: children ? 2 : 1 }}
            spacing="xl"
            verticalSpacing="var(--step)"
          >
            <Section title={t('info')} gap={0}>
              {/*
                One ruled line per field: its name on the left (one column, as wide as the
                longest name), the compact field (one line high) on the right.
              */}
              <div className={classes.fieldGrid}>
                <FieldRow id={`${fieldId}-date`} label={t('date')}>
                  <DatePickerInput
                    id={`${fieldId}-date`}
                    size="xs"
                    value={values.date}
                    onChange={(date) => date && changeDate(date)}
                    valueFormat="ddd D MMM YYYY"
                    leftSection={<IconCalendar size={16} />}
                    // An FFTA competition keeps its competition's day (DATE_LOCKED).
                    readOnly={readOnly || session.fftaCompetitionId !== null}
                    title={session.fftaCompetitionId ? t('dateFromFfta') : undefined}
                    // A coach moves what they planned to another day still to come.
                    minDate={coach ? tomorrow() : undefined}
                    maxDate={coach?.lastDay}
                  />
                </FieldRow>
                {(form === 'sheet' || form === 'none') && (
                  <FieldRow id={`${fieldId}-duration`} label={t('duration')}>
                    <NumberInput
                      id={`${fieldId}-duration`}
                      size="xs"
                      maw={NUMBER_WIDTH}
                      value={values.durationMinutes ?? ''}
                      onChange={(v) => set('durationMinutes', toNumber(v))}
                      readOnly={readOnly}
                      min={0}
                      max={1440}
                      step={15}
                      allowDecimal={false}
                    />
                  </FieldRow>
                )}
                {hasSheet && (
                  <>
                    <FieldRow id={`${fieldId}-location`} label={t('location')}>
                      <Autocomplete
                        id={`${fieldId}-location`}
                        size="xs"
                        placeholder={t('locationPlaceholder')}
                        value={values.location ?? ''}
                        onChange={(v) => set('location', toText(v))}
                        readOnly={readOnly}
                        data={readOnly ? [] : suggestions.locations}
                        leftSection={<IconMapPin size={16} />}
                        limit={8}
                      />
                    </FieldRow>
                    <FieldRow label={t('discipline')}>
                      <Chip.Group
                        multiple={false}
                        value={values.discipline ?? ''}
                        onChange={(v) =>
                          set('discipline', v === values.discipline ? null : (v as Discipline))
                        }
                      >
                        <Group
                          role="radiogroup"
                          aria-label={t('discipline')}
                          className={classes.chipLines}
                        >
                          {shownDisciplines.map((d) => (
                            <Chip
                              key={d}
                              value={d}
                              size="xs"
                              // The discipline's own pastel (as on the national rankings).
                              color={DISCIPLINE_COLORS[d]}
                              variant="light"
                              onClick={() => d === values.discipline && set('discipline', null)}
                            >
                              {t(`disciplines.${d}`)}
                            </Chip>
                          ))}
                        </Group>
                      </Chip.Group>
                    </FieldRow>
                    <FieldRow
                      id={`${fieldId}-distance`}
                      label={t('distance')}
                      // One tap for the usual distances: all three on the line under the field.
                      below={
                        <Group className={classes.chipLines} wrap="nowrap">
                          {QUICK_DISTANCES.map((d) => (
                            <Chip
                              key={d}
                              size="xs"
                              checked={values.distanceMeters === d}
                              onChange={() =>
                                set('distanceMeters', values.distanceMeters === d ? null : d)
                              }
                            >
                              {d} m
                            </Chip>
                          ))}
                        </Group>
                      }
                    >
                      <NumberInput
                        id={`${fieldId}-distance`}
                        size="xs"
                        maw={NUMBER_WIDTH}
                        value={values.distanceMeters ?? ''}
                        onChange={(v) => set('distanceMeters', toNumber(v))}
                        readOnly={readOnly}
                        min={0}
                        max={1000}
                        allowDecimal={false}
                      />
                    </FieldRow>
                    <FieldRow id={`${fieldId}-arrows`} label={t('arrows')} locked={locked}>
                      <NumberInput
                        id={`${fieldId}-arrows`}
                        size="xs"
                        disabled={locked}
                        maw={NUMBER_WIDTH}
                        value={values.arrowCount ?? ''}
                        onChange={(v) => set('arrowCount', toNumber(v))}
                        readOnly={readOnly}
                        min={0}
                        max={2000}
                        step={6}
                        allowDecimal={false}
                      />
                    </FieldRow>
                    <FieldRow id={`${fieldId}-score`} label={t('score')} locked={locked}>
                      <NumberInput
                        id={`${fieldId}-score`}
                        size="xs"
                        disabled={locked}
                        maw={NUMBER_WIDTH}
                        value={values.score ?? ''}
                        onChange={(v) => set('score', toNumber(v))}
                        readOnly={readOnly}
                        min={0}
                        max={2000}
                        allowDecimal={false}
                      />
                    </FieldRow>
                  </>
                )}
                {form === 'note' && (
                  <FieldRow
                    id={`${fieldId}-title`}
                    label={t('title')}
                    below={
                      <Text size="xs" c="dimmed" className={classes.fieldHint}>
                        {t('titleHint')}
                      </Text>
                    }
                  >
                    <TextInput
                      id={`${fieldId}-title`}
                      size="xs"
                      value={values.title ?? ''}
                      onChange={(e) => set('title', toText(e.currentTarget.value))}
                      readOnly={readOnly}
                      maxLength={100}
                    />
                  </FieldRow>
                )}
              </div>

              {hasSheet ? null : form === 'note' || form === 'text' ? (
                <Stack gap="md" mt="md">
                  {/* A custom event looks like its type (set where the type is defined). */}
                  {form === 'note' && !readOnly && (
                    <>
                      <ColorPicker
                        value={values.color ?? DEFAULT_NOTE_COLOR}
                        onChange={(color) => set('color', color)}
                      />
                      <IconPicker
                        value={values.icon ?? 'NOTE'}
                        color={values.color ?? DEFAULT_NOTE_COLOR}
                        onChange={(icon) => set('icon', icon)}
                      />
                    </>
                  )}
                  <Textarea
                    {...RULED_TEXT}
                    label={form === 'text' ? t('customDescription') : t('note')}
                    // A custom event's "Description": written like the fields' names, in the
                    // archer's font (Profile page).
                    classNames={
                      form === 'text'
                        ? { ...RULED_TEXT.classNames, label: classes.fieldName }
                        : RULED_TEXT.classNames
                    }
                    value={values.description ?? ''}
                    onChange={(e) => set('description', toText(e.currentTarget.value))}
                    readOnly={readOnly}
                    autosize
                    minRows={4}
                    maxLength={5000}
                  />
                </Stack>
              ) : (
                <Alert color={SESSION_TYPES.STRENGTH.color} variant="light" mt="md">
                  {t('strengthComing')}
                </Alert>
              )}
            </Section>
            <SheetLockedContext value={locked}>{children}</SheetLockedContext>
          </SimpleGrid>

          {hasSheet && (
            <>
              <Section title={t('objective')} gap={0}>
                <Textarea
                  {...RULED_TEXT}
                  aria-label={t('objective')}
                  value={values.objective ?? ''}
                  onChange={(e) => set('objective', toText(e.currentTarget.value))}
                  readOnly={readOnly}
                  autosize
                  minRows={2}
                  maxLength={5000}
                />
              </Section>

              {locked && (
                <Text size="sm" c="dimmed" className={classes.fieldHint}>
                  {t('reviewLocked')}
                </Text>
              )}

              <Section title={t('selfAssessment')} locked={locked}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                  <Rating
                    label={t('satisfaction')}
                    notRated={t('notRated')}
                    value={values.satisfaction}
                    onChange={(v) => set('satisfaction', v)}
                    disabled={locked}
                  />
                  <Rating
                    label={t('technique')}
                    notRated={t('notRated')}
                    value={values.technique}
                    onChange={(v) => set('technique', v)}
                    disabled={locked}
                  />
                </SimpleGrid>
              </Section>

              <Section title={t('description')} gap={0} locked={locked}>
                <Textarea
                  {...RULED_TEXT}
                  disabled={locked}
                  aria-label={t('description')}
                  value={values.description ?? ''}
                  onChange={(e) => set('description', toText(e.currentTarget.value))}
                  readOnly={readOnly}
                  autosize
                  minRows={6}
                  maxLength={5000}
                />
              </Section>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {/* No gap: the faces' frame starts on the title's line (see .feelingBox). */}
                <Section title={t('physical')} gap={0} locked={locked}>
                  <FeelingPicker
                    label={t('physical')}
                    value={values.physicalFeeling}
                    onChange={(v) => set('physicalFeeling', v)}
                    disabled={locked}
                  />
                </Section>
                <Section title={t('mental')} gap={0} locked={locked}>
                  <FeelingPicker
                    label={t('mental')}
                    value={values.mentalFeeling}
                    onChange={(v) => set('mentalFeeling', v)}
                    disabled={locked}
                  />
                </Section>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {(['wentWell', 'toImprove'] as const).map((list) => (
                  // No gap: one line of the list per ruled line, right under the box's name.
                  // Room kept for all its lines (name + LIST_LINES), so the boxes below don't
                  // move as lines appear.
                  <Section
                    key={list}
                    title={t(list)}
                    gap={0}
                    mih={`calc(var(--step) * ${1 + LIST_LINES})`}
                    locked={locked}
                  >
                    {visibleLines(values[list]).map((line, index) => (
                      <Autocomplete
                        key={index}
                        disabled={locked}
                        variant="unstyled"
                        classNames={{ input: classes.ruledLine }}
                        // Blank: lets CSS tell an empty line and draw the pen in it.
                        placeholder=" "
                        aria-label={`${t(list)} ${index + 1}`}
                        value={line}
                        onChange={(v) => setLine(list, index, v)}
                        readOnly={readOnly}
                        // Previously typed lines, minus those already used on this sheet.
                        data={
                          readOnly ? [] : suggestions[list].filter((s) => !values[list].includes(s))
                        }
                        limit={8}
                        maxLength={200}
                        leftSection={
                          list === 'wentWell' ? (
                            <IconCheck size={18} color="var(--mantine-color-teal-filled)" />
                          ) : (
                            <IconArrowRight size={18} color="var(--mantine-color-orange-filled)" />
                          )
                        }
                      />
                    ))}
                  </Section>
                ))}
              </SimpleGrid>

              <Section title={t('nextTime')} gap={0} locked={locked}>
                <Textarea
                  {...RULED_TEXT}
                  disabled={locked}
                  aria-label={t('nextTime')}
                  value={values.nextTime ?? ''}
                  onChange={(e) => set('nextTime', toText(e.currentTarget.value))}
                  readOnly={readOnly}
                  autosize
                  minRows={3}
                  maxLength={5000}
                />
              </Section>
            </>
          )}
        </RuledStack>
      </LooseLeaf>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={<Text fw={600}>{t('deleteTitle')}</Text>}
        centered
      >
        <Stack>
          <Text size="sm">{t('deleteBody')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmDelete(false)}>
              {t('cancel')}
            </Button>
            <Button
              color="red"
              loading={deleting}
              onClick={() =>
                startDeleting(async () => {
                  // Back to the month of the event as saved, like closing the sheet.
                  const month = (JSON.parse(saved) as Values).date.slice(0, 7);
                  setState(
                    coach
                      ? await deletePlannedSession(coach.archerId, session.id, month)
                      : await deleteSession(session.id, month),
                  );
                  setConfirmDelete(false);
                })
              }
            >
              {t('delete')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={<Text fw={600}>{t('leaveTitle')}</Text>}
        centered
      >
        <Stack>
          <Text size="sm">{t('leaveBody')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmLeave(false)}>
              {t('stay')}
            </Button>
            <Button color="red" onClick={leave}>
              {t('leaveWithoutSaving')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={futureDate !== null}
        onClose={() => setFutureDate(null)}
        title={<Text fw={600}>{t('futureDateTitle')}</Text>}
        centered
      >
        <Stack>
          <Text size="sm">{t('futureDateBody')}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setFutureDate(null)}>
              {t('cancel')}
            </Button>
            <Button color="orange" onClick={confirmFutureDate}>
              {t('futureDateConfirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

/**
 * A line of the Informations box (within `.fieldGrid`): the field's name on the left, the
 * field on its right, both on one ruled line; `below` (e.g. quick choices) on the next line,
 * under the field.
 */
function FieldRow({
  id,
  label,
  below,
  locked,
  children,
}: {
  id?: string;
  label: string;
  below?: ReactNode;
  /** Greyed name: a review field of an event still to come. */
  locked?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={classes.fieldRow}>
      <Text
        component="label"
        htmlFor={id}
        className={classes.fieldName}
        data-locked={locked || undefined}
      >
        {label}
      </Text>
      <div className={classes.fieldValue}>{children}</div>
      {below && <div className={classes.fieldBelow}>{below}</div>}
    </div>
  );
}

/** A box of the sheet, unframed: its name on a ruled line, its fields below. */
function Section({
  title,
  gap = 'xs',
  mih,
  locked,
  children,
}: {
  title: string;
  /** Between the name and the fields: 0 when they keep to the sheet's lines too. */
  gap?: number | string;
  /** Height kept even when the box shows less (e.g. a list's lines still to come). */
  mih?: string;
  /** Greyed: part of the review of an event still to come (its fields are disabled). */
  locked?: boolean;
  children: ReactNode;
}) {
  return (
    <Stack component="section" gap={gap} mih={mih} className={locked ? classes.locked : undefined}>
      <Title order={2} className={classes.boxTitle}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}

/** 0–10 slider; stays "not rated" (null) until touched. */
/** A rating's colour: red up to 3, orange from 4 to 6, green from 7; grey while not rated. */
function ratingColor(value: number | null): string {
  if (value === null) return 'gray';
  if (value <= 3) return 'red';
  return value < 7 ? 'orange' : 'green';
}

function Rating({
  label,
  notRated,
  value,
  onChange,
  disabled,
}: {
  label: string;
  notRated: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <Stack gap={8}>
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text size="sm" fw={600} c={value === null ? 'dimmed' : undefined}>
          {value === null ? notRated : `${value} / 10`}
        </Text>
      </Group>
      <Slider
        thumbLabel={label}
        min={0}
        max={10}
        step={1}
        value={value ?? 0}
        onChange={onChange}
        disabled={disabled}
        color={ratingColor(value)}
        marks={Array.from({ length: 11 }, (_, v) => ({
          value: v,
          label: v % 5 === 0 ? String(v) : undefined,
        }))}
        mb="md"
      />
    </Stack>
  );
}

/** The four faces of the paper sheet; tapping the selected one clears it. */
function FeelingPicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: Feeling | null;
  onChange: (value: Feeling | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('journal.feelings');
  return (
    <Group
      gap="sm"
      justify="space-around"
      role="radiogroup"
      aria-label={label}
      className={classes.feelingBox}
    >
      {FEELINGS.map(({ value: feeling, icon: Icon, color }) => {
        const selected = value === feeling;
        return (
          <Stack key={feeling} gap={4} align="center">
            <ActionIcon
              role="radio"
              aria-checked={selected}
              aria-label={t(feeling)}
              size={52}
              radius="xl"
              variant={selected ? 'filled' : 'subtle'}
              color={selected ? color : 'gray'}
              className={classes.feeling}
              data-selected={selected || undefined}
              disabled={disabled}
              onClick={() => onChange(selected ? null : feeling)}
            >
              <Icon size={36} color={selected ? FEELING_INK : undefined} />
            </ActionIcon>
            <Text size="xs" c={selected ? undefined : 'dimmed'}>
              {t(feeling)}
            </Text>
          </Stack>
        );
      })}
    </Group>
  );
}

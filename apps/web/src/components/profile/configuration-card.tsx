'use client';

import { Checkbox, MultiSelect, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import type {
  AgeCategory,
  ArcherProfile,
  BowType,
  Department,
  Discipline,
} from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useId, useState, useTransition } from 'react';
import { saveProfile } from '@/app/actions/profile';
import { DISCIPLINE_ORDER } from '@/components/journal/session-types';
import type { ActionState } from '@/lib/action-state';
import { ProfileCard, SaveBar } from './list-card';
import classes from './profile.module.css';

const CATEGORIES: AgeCategory[] = ['U11', 'U13', 'U15', 'U18', 'U21', 'S1', 'S2', 'S3'];
const BOW_TYPES: BowType[] = ['RECURVE', 'COMPOUND', 'BAREBOW', 'LONGBOW', 'HUNTING', 'FREE'];
/** As many departments as the API takes (`departments` in the archer profile). */
const MAX_DEPARTMENTS = 5;

/** Sport details: licence, category, bow and practised disciplines. */
export function ConfigurationCard({ profile }: { profile: ArcherProfile }) {
  const t = useTranslations();
  /** Ties the names to their fields. */
  const fieldId = useId();
  // Only this card's fields: the Personalisation card saves the others on its own.
  const [values, setValues] = useState({
    licenceNumber: profile.licenceNumber ?? '',
    category: profile.category,
    bowType: profile.bowType,
    disciplines: profile.disciplines,
  });
  /** The values as last saved: "Save" only once something differs. */
  const [saved, setSaved] = useState(() => JSON.stringify(values));
  const dirty = JSON.stringify(values) !== saved;
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setState({});
  };

  return (
    <ProfileCard title={t('profile.config.title')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!dirty) return;
          const snapshot = values;
          startTransition(async () => {
            const result = await saveProfile({
              ...snapshot,
              licenceNumber: snapshot.licenceNumber.trim() || null,
            });
            setState(result);
            if (!result.code) setSaved(JSON.stringify(snapshot));
          });
        }}
      >
        <Stack gap="md">
          {/*
            One field per row, each name on the left of its field (the names' column as wide
            as the longest), so the chosen category and bow show in full.
          */}
          <div className={classes.fieldRows}>
            <label htmlFor={`${fieldId}-licence`} className={classes.fieldName}>
              {t('profile.config.licence')}
            </label>
            <TextInput
              id={`${fieldId}-licence`}
              value={values.licenceNumber}
              onChange={(e) => set('licenceNumber', e.currentTarget.value)}
              maxLength={20}
            />
            <label htmlFor={`${fieldId}-category`} className={classes.fieldName}>
              {t('profile.config.category')}
            </label>
            <Select
              id={`${fieldId}-category`}
              placeholder={t('profile.config.choose')}
              data={CATEGORIES.map((c) => ({ value: c, label: t(`profile.categories.${c}`) }))}
              value={values.category}
              onChange={(v) => set('category', v as AgeCategory | null)}
              clearable
            />
            <label htmlFor={`${fieldId}-bow`} className={classes.fieldName}>
              {t('profile.config.bowType')}
            </label>
            <Select
              id={`${fieldId}-bow`}
              placeholder={t('profile.config.choose')}
              data={BOW_TYPES.map((b) => ({ value: b, label: t(`profile.bowTypes.${b}`) }))}
              value={values.bowType}
              onChange={(v) => set('bowType', v as BowType | null)}
              clearable
            />
          </div>
          <Checkbox.Group
            label={t('profile.config.disciplines')}
            value={values.disciplines}
            onChange={(v) => set('disciplines', v as Discipline[])}
          >
            <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="sm" mt="xs">
              {DISCIPLINE_ORDER.map((d) => (
                <Checkbox key={d} value={d} label={t(`journal.disciplines.${d}`)} />
              ))}
            </SimpleGrid>
          </Checkbox.Group>
          <SaveBar
            state={state}
            savedLabel={t('profile.config.saved')}
            label={t('profile.config.save')}
            disabled={!dirty}
            loading={pending}
          />
        </Stack>
      </form>
    </ProfileCard>
  );
}

/** Which FFTA competitions the calendars show: those of up to 5 departments, para ones or not. */
export function CompetitionsCard({
  profile,
  departments,
}: {
  profile: Pick<ArcherProfile, 'departments' | 'paraCompetitions'>;
  departments: Department[];
}) {
  const t = useTranslations('profile.competitions');
  const fieldId = useId();
  const [values, setValues] = useState({
    departments: profile.departments,
    paraCompetitions: profile.paraCompetitions,
  });
  const [saved, setSaved] = useState(() => JSON.stringify(values));
  const dirty = JSON.stringify(values) !== saved;
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setState({});
  };

  return (
    <ProfileCard title={t('title')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!dirty) return;
          const snapshot = values;
          startTransition(async () => {
            const result = await saveProfile(snapshot);
            setState(result);
            if (!result.code) setSaved(JSON.stringify(snapshot));
          });
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('hint', { max: MAX_DEPARTMENTS })}
          </Text>
          <div className={classes.fieldRows}>
            <label htmlFor={`${fieldId}-departments`} className={classes.fieldName}>
              {t('departments')}
            </label>
            <MultiSelect
              id={`${fieldId}-departments`}
              // Only while none is chosen.
              placeholder={values.departments.length === 0 ? t('noDepartment') : undefined}
              data={departments.map((d) => ({ value: d.code, label: `${d.code} - ${d.name}` }))}
              value={values.departments}
              onChange={(v) => set('departments', v)}
              maxValues={MAX_DEPARTMENTS}
              searchable
              clearable
              hidePickedOptions
            />
          </div>
          <Checkbox
            label={t('para')}
            checked={values.paraCompetitions}
            onChange={(e) => set('paraCompetitions', e.currentTarget.checked)}
          />
          <SaveBar
            state={state}
            savedLabel={t('saved')}
            label={t('save')}
            disabled={!dirty}
            loading={pending}
          />
        </Stack>
      </form>
    </ProfileCard>
  );
}

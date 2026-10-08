'use client';

import { Button, Checkbox, Group, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import type { AgeCategory, ArcherProfile, BowType, Discipline } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { saveProfile } from '@/app/actions/profile';
import { FormError, SuccessNotice } from '@/components/form-feedback';
import { DISCIPLINE_ORDER } from '@/components/journal/session-types';
import type { ActionState } from '@/lib/action-state';
import { ProfileCard } from './list-card';

const CATEGORIES: AgeCategory[] = ['U11', 'U13', 'U15', 'U18', 'U21', 'S1', 'S2', 'S3'];
const BOW_TYPES: BowType[] = ['RECURVE', 'COMPOUND', 'BAREBOW', 'LONGBOW', 'HUNTING', 'FREE'];

/** Sport details: licence, category, bow and practised disciplines. */
export function ConfigurationCard({ profile }: { profile: ArcherProfile }) {
  const t = useTranslations();
  const [values, setValues] = useState({
    ...profile,
    licenceNumber: profile.licenceNumber ?? '',
  });
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
          startTransition(async () => {
            setState(
              await saveProfile({ ...values, licenceNumber: values.licenceNumber.trim() || null }),
            );
          });
        }}
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
            <TextInput
              label={t('profile.config.licence')}
              value={values.licenceNumber}
              onChange={(e) => set('licenceNumber', e.currentTarget.value)}
              maxLength={20}
            />
            <Select
              label={t('profile.config.category')}
              placeholder={t('profile.config.choose')}
              data={CATEGORIES.map((c) => ({ value: c, label: t(`profile.categories.${c}`) }))}
              value={values.category}
              onChange={(v) => set('category', v as AgeCategory | null)}
              clearable
            />
            <Select
              label={t('profile.config.bowType')}
              placeholder={t('profile.config.choose')}
              data={BOW_TYPES.map((b) => ({ value: b, label: t(`profile.bowTypes.${b}`) }))}
              value={values.bowType}
              onChange={(v) => set('bowType', v as BowType | null)}
              clearable
            />
          </SimpleGrid>
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
          <FormError state={state} />
          {state.notice === 'saved' && <SuccessNotice>{t('profile.config.saved')}</SuccessNotice>}
          <Group justify="flex-end">
            <Button type="submit" loading={pending}>
              {t('profile.config.save')}
            </Button>
          </Group>
        </Stack>
      </form>
    </ProfileCard>
  );
}

/** Display options — not wired yet: shown so archers see what is coming. */
export function OptionsCard() {
  const t = useTranslations('profile.options');
  return (
    <ProfileCard
      title={t('title')}
      action={
        <Text size="sm" c="dimmed">
          {t('soon')}
        </Text>
      }
    >
      <Stack gap="sm">
        <Checkbox label={t('departmental')} disabled />
        <Checkbox label={t('regional')} disabled />
      </Stack>
    </ProfileCard>
  );
}

'use client';

import { Select, Stack } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { saveProfile } from '@/app/actions/profile';
import type { ActionState } from '@/lib/action-state';
import {
  CALENDAR_FONT_IDS,
  type CalendarFontId,
  calendarFont,
  calendarFontFamily,
} from '@/lib/calendar-fonts';
import { ProfileCard, SaveBar } from './list-card';
import classes from './profile.module.css';

/** How the archer's notebook looks: for now, the calendars' font. */
export function PersonalizationCard({ font }: { font: string | null }) {
  const t = useTranslations('profile.personalization');
  const tFonts = useTranslations('profile.calendarFonts');
  const [value, setValue] = useState<CalendarFontId>(calendarFont(font));
  /** The font as last saved: "Save" only once another one is picked. */
  const [saved, setSaved] = useState<CalendarFontId>(value);
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  return (
    <ProfileCard title={t('title')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value === saved) return;
          const chosen = value;
          startTransition(async () => {
            const result = await saveProfile({ calendarFont: chosen });
            setState(result);
            if (!result.code) setSaved(chosen);
          });
        }}
      >
        <Stack gap="md">
          <Select
            label={t('calendarFont')}
            description={t('calendarFontHint')}
            data={CALENDAR_FONT_IDS.map((id) => ({ value: id, label: tFonts(id) }))}
            value={value}
            onChange={(v) => {
              if (!v) return;
              setValue(v as CalendarFontId);
              setState({});
            }}
            allowDeselect={false}
            // Each font shown in itself, with a few days as a sample.
            renderOption={({ option }) => (
              <span style={{ fontFamily: calendarFontFamily(option.value as CalendarFontId) }}>
                <span className={classes.fontName}>{option.label}</span>
                <span className={classes.fontSample}>{t('calendarFontSample')}</span>
              </span>
            )}
            styles={{ input: { fontFamily: calendarFontFamily(value) } }}
            maw={360}
          />
          <SaveBar
            state={state}
            savedLabel={t('saved')}
            label={t('save')}
            disabled={value === saved}
            loading={pending}
          />
        </Stack>
      </form>
    </ProfileCard>
  );
}

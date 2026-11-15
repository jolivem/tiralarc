'use client';

import { Tooltip } from '@mantine/core';
import { IconPencilPlus } from '@tabler/icons-react';
import type { CustomEventType, Journal } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type NewSessionDefaults, NewSessionModal } from './new-session-modal';
import classes from './today-entry.module.css';

/**
 * The day written on the home notebook, with a pen on its left: a click on either opens the
 * new-event dialog on today. Only when the selected journal covers today (else the dialog would
 * move the day into its period); otherwise the day is plain text.
 */
export function TodayEntry({
  label,
  today,
  journal,
  customTypes,
  className,
}: {
  /** The day, written out. */
  label: string;
  today: string;
  journal: Journal | null;
  customTypes: CustomEventType[];
  /** The day's own look (colour, underline). */
  className?: string;
}) {
  const t = useTranslations('archer');
  const [defaults, setDefaults] = useState<NewSessionDefaults | null>(null);

  if (!journal || today < journal.startDate || today > journal.endDate) {
    return <span className={className}>{label}</span>;
  }
  const open = () => setDefaults({ date: today });
  return (
    <>
      <Tooltip label={t('addToday')}>
        <button
          type="button"
          className={`${classes.button} ${classes.pen} ${className ?? ''}`}
          onClick={open}
          aria-label={t('addToday')}
        >
          <IconPencilPlus size="1em" stroke={1.8} aria-hidden />
        </button>
      </Tooltip>
      <button type="button" className={`${classes.button} ${className ?? ''}`} onClick={open}>
        {label}
      </button>
      <NewSessionModal
        journal={journal}
        customTypes={customTypes}
        defaults={defaults}
        onClose={() => setDefaults(null)}
      />
    </>
  );
}

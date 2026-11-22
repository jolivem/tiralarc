'use client';

import { Select } from '@mantine/core';
import type { StrengthStep } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { sheetProgramme, strengthSheets } from '@/app/actions/sheets';

/**
 * On a STRENGTH event: the archer's strength sheets (read once shown); one picked gives the
 * event its programme, replacing the one it had (saved with the sheet). Hidden without any.
 */
export function FromStrengthSheet({ onPick }: { onPick: (steps: StrengthStep[]) => void }) {
  const t = useTranslations('strength');
  const [sheets, setSheets] = useState<{ value: string; label: string }[]>([]);
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    let current = true;
    strengthSheets().then((list) => {
      if (current) setSheets(list.map(({ id, title }) => ({ value: id, label: title })));
    });
    return () => {
      current = false;
    };
  }, []);

  const pick = (id: string | null) => {
    if (!id) return;
    startLoading(async () => {
      const steps = await sheetProgramme(id);
      if (steps) onPick(steps);
    });
  };

  if (sheets.length === 0) return null;
  return (
    <Select
      size="xs"
      w={240}
      placeholder={t('fromSheet')}
      aria-label={t('fromSheet')}
      title={t('fromSheetHint')}
      data={sheets}
      value={null}
      onChange={pick}
      disabled={loading}
      comboboxProps={{ withinPortal: true }}
    />
  );
}

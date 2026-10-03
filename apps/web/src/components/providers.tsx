'use client';

import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import type { ReactNode } from 'react';
import { theme } from '@/theme';

/** Mantine theme + date settings (localized month/day names, weeks starting on Monday). */
export function Providers({ locale, children }: { locale: string; children: ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <DatesProvider settings={{ locale, firstDayOfWeek: 1 }}>{children}</DatesProvider>
    </MantineProvider>
  );
}

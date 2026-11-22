import { IconAdjustments, IconBarbell, IconBrain, IconTarget } from '@tabler/icons-react';
import type { SheetCategory } from '@tiralarc/api-client';
import type { ComponentType } from 'react';

/** The binder's four parts, in order (two by two from tablets up). Texts: `sheets.categories.<id>`. */
export const SHEET_CATEGORIES: readonly {
  id: SheetCategory;
  icon: ComponentType<{ size?: number; stroke?: number }>;
}[] = [
  { id: 'TECHNIQUE', icon: IconTarget },
  { id: 'SETTINGS', icon: IconAdjustments },
  { id: 'STRENGTH', icon: IconBarbell },
  { id: 'MENTAL', icon: IconBrain },
];

/** The categories whose sheets take photos (4 each, as the API checks). */
export const PHOTO_CATEGORIES: readonly SheetCategory[] = ['TECHNIQUE'];

/** Where a sheet opens: the archer's own binder, or their coach's view of it. */
export const sheetsPath = (archerId?: string) =>
  archerId ? `/coach/${archerId}/sheets` : '/archer/sheets';

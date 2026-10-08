import { IconBarbell, IconNote, IconSchool, IconTarget, IconTrophy } from '@tabler/icons-react';
import type { Discipline, SessionType } from '@tiralarc/api-client';

/**
 * Color (Mantine palette), icon and form of each event type, shared by the calendar and the forms.
 * `form`: "sheet" = the full session sheet, "note" = a date and a free text, "none" = nothing yet.
 */
export const SESSION_TYPES: Record<
  SessionType,
  { color: string; icon: typeof IconTarget; form: 'sheet' | 'note' | 'none' }
> = {
  TRAINING: { color: 'teal', icon: IconTarget, form: 'sheet' },
  COACHING: { color: 'blue', icon: IconSchool, form: 'sheet' },
  COMPETITION: { color: 'orange', icon: IconTrophy, form: 'sheet' },
  // Its own form will be defined later.
  STRENGTH: { color: 'grape', icon: IconBarbell, form: 'none' },
  OTHER: { color: 'gray', icon: IconNote, form: 'note' },
};

export const SESSION_TYPE_ORDER: SessionType[] = [
  'TRAINING',
  'COACHING',
  'COMPETITION',
  'STRENGTH',
  'OTHER',
];

/** Display order of the disciplines (session sheet, archer profile). */
export const DISCIPLINE_ORDER: Discipline[] = [
  'INDOOR',
  'TAE_NATIONAL',
  'TAE_INTERNATIONAL',
  'BEURSAULT',
  'THREE_D',
  'FIELD',
  'RUN_ARCHERY',
];

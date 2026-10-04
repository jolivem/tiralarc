import { IconBarbell, IconSchool, IconTarget, IconTrophy } from '@tabler/icons-react';
import type { SessionType } from '@tiralarc/api-client';

/** Color (Mantine palette) and icon of each session type, shared by the calendar and the forms. */
export const SESSION_TYPES: Record<
  SessionType,
  { color: string; icon: typeof IconTarget; hasSheet: boolean }
> = {
  TRAINING: { color: 'teal', icon: IconTarget, hasSheet: true },
  COACHING: { color: 'blue', icon: IconSchool, hasSheet: true },
  COMPETITION: { color: 'orange', icon: IconTrophy, hasSheet: true },
  // Its own form will be defined later.
  STRENGTH: { color: 'grape', icon: IconBarbell, hasSheet: false },
};

export const SESSION_TYPE_ORDER: SessionType[] = [
  'TRAINING',
  'COACHING',
  'COMPETITION',
  'STRENGTH',
];

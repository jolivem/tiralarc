import { IconNote } from '@tabler/icons-react';
import type { Discipline, SessionType } from '@tiralarc/api-client';
import { type EventIconComponent, pictureIcon } from './image-icon';

/**
 * Color (Mantine palette), icon and form of each event type, shared by the calendar and the forms.
 * `form`: "sheet" = the full session sheet, "note" = a date and a free text, "none" = nothing yet.
 * Icons: drawings in `public/icons/events/` (bow, progression, target, dumbbell), in their own
 * colours: black outlines filled with a pastel (bow, progression, dumbbell drawn 1.2× larger).
 */
/** Bow, progression and dumbbell: drawn a little larger than their box. */
const ICON_SCALE = 1.2;

export const SESSION_TYPES: Record<
  SessionType,
  { color: string; icon: EventIconComponent; form: 'sheet' | 'note' | 'none' }
> = {
  TRAINING: {
    color: 'teal',
    // Lavender inside.
    icon: pictureIcon('/icons/events/training-colour.png', 'TrainingIcon', ICON_SCALE),
    form: 'sheet',
  },
  COACHING: {
    color: 'blue',
    // Sky blue inside.
    icon: pictureIcon('/icons/events/coaching-colour.png', 'CoachingIcon', ICON_SCALE),
    form: 'sheet',
  },
  COMPETITION: {
    color: 'orange',
    // In its own colours (yellow, red, blue, black, white rings), not the type's.
    icon: pictureIcon('/icons/events/competition.svg', 'CompetitionIcon'),
    form: 'sheet',
  },
  // Its own form will be defined later.
  STRENGTH: {
    color: 'grape',
    // Pearl grey inside.
    icon: pictureIcon('/icons/events/strength-colour.png', 'StrengthIcon', ICON_SCALE),
    form: 'none',
  },
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

import { IconNote } from '@tabler/icons-react';
import type { Discipline, SessionType } from '@tiralarc/api-client';
import { type EventIconComponent, pictureIcon } from './image-icon';

/**
 * Color (Mantine palette), icon and form of each event type, shared by the calendar and the forms.
 * `form`: "sheet" = the full session sheet, "note" = a date, a free text and its own look (title,
 * colour, pictogram), "text" = a date and a free text (the look is its custom type's), "none" =
 * nothing yet. `photos`: whether its sheet takes photos.
 * Icons: drawings in `public/icons/events/` (bow, progression, target, dumbbell), in their own
 * colours: black outlines filled with a pastel (bow, progression, dumbbell drawn 1.2× larger).
 */
/** Bow, progression and dumbbell: drawn a little larger than their box. */
const ICON_SCALE = 1.2;

export const SESSION_TYPES: Record<
  SessionType,
  {
    color: string;
    icon: EventIconComponent;
    form: 'sheet' | 'note' | 'text' | 'none';
    photos: boolean;
  }
> = {
  TRAINING: {
    color: 'teal',
    // Lavender limbs and grip; the space between string and bow stays clear.
    icon: pictureIcon('/icons/events/training-colour.png', 'TrainingIcon', ICON_SCALE),
    form: 'sheet',
    photos: true,
  },
  COACHING: {
    color: 'blue',
    // Sky blue inside.
    icon: pictureIcon('/icons/events/coaching-colour.png', 'CoachingIcon', ICON_SCALE),
    form: 'sheet',
    photos: true,
  },
  COMPETITION: {
    color: 'orange',
    // In its own colours (yellow, red, blue, black, white rings), not the type's.
    icon: pictureIcon('/icons/events/competition.svg', 'CompetitionIcon'),
    form: 'sheet',
    photos: true,
  },
  // Its own form will be defined later.
  STRENGTH: {
    color: 'grape',
    // Pearl grey inside.
    icon: pictureIcon('/icons/events/strength-colour.png', 'StrengthIcon', ICON_SCALE),
    form: 'none',
    photos: false,
  },
  // No longer offered for new events (the archer's own types replace it); older ones keep it.
  OTHER: { color: 'gray', icon: IconNote, form: 'note', photos: true },
  // One of the archer's own types: its colour and pictogram replace these (see eventDisplay).
  CUSTOM: { color: 'gray', icon: IconNote, form: 'text', photos: false },
};

/** The built-in types offered for new events (the archer's own types come after them). */
export const SESSION_TYPE_ORDER: SessionType[] = [
  'TRAINING',
  'COACHING',
  'COMPETITION',
  'STRENGTH',
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

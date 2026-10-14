import type { Feeling } from '@tiralarc/api-client';
import { type EventIconComponent, imageIcon } from './image-icon';
import { PASTELS } from './month-title';

/**
 * The four faces of the paper sheet (drawings in public/icons/feelings/), each with a pastel
 * of the month-name palette: yellow, pink, blue, green. Used by the event sheet and the
 * indicators.
 */
export const FEELINGS: { value: Feeling; icon: EventIconComponent; color: string }[] = [
  {
    value: 'GREAT',
    icon: imageIcon('/icons/feelings/great.png', 'GreatIcon'),
    color: PASTELS.lemon,
  },
  { value: 'OK', icon: imageIcon('/icons/feelings/ok.png', 'OkIcon'), color: PASTELS.rose },
  { value: 'BAD', icon: imageIcon('/icons/feelings/bad.png', 'BadIcon'), color: PASTELS.sky },
  {
    value: 'EXHAUSTED',
    icon: imageIcon('/icons/feelings/exhausted.png', 'ExhaustedIcon'),
    color: PASTELS.mint,
  },
];

/** A face on its pastel: dark (white would vanish on it). */
export const FEELING_INK = '#343a40';

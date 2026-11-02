import type { Feeling } from '@tiralarc/api-client';
import { type EventIconComponent, imageIcon } from './image-icon';
import { PASTELS } from './month-title';

const face = (value: Feeling, file: string, name: string, color: string) => {
  const src = `/icons/feelings/${file}.png`;
  return { value, src, icon: imageIcon(src, name), color };
};

/**
 * The four faces of the paper sheet (drawings in public/icons/feelings/, `src`), each with a
 * pastel of the month-name palette: yellow, pink, blue, green. Used by the event sheet, the
 * indicators and the Instagram card.
 */
export const FEELINGS: { value: Feeling; src: string; icon: EventIconComponent; color: string }[] =
  [
    face('GREAT', 'great', 'GreatIcon', PASTELS.lemon),
    face('OK', 'ok', 'OkIcon', PASTELS.rose),
    face('BAD', 'bad', 'BadIcon', PASTELS.sky),
    face('EXHAUSTED', 'exhausted', 'ExhaustedIcon', PASTELS.mint),
  ];

/** A face on its pastel: dark (white would vanish on it). */
export const FEELING_INK = '#343a40';

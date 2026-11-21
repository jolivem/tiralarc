import { describe, expect, it } from 'vitest';
import { appendDictation } from './dictation';

describe('appendDictation', () => {
  it('starts an empty text with a capital', () => {
    expect(appendDictation(null, ' bonne séance ')).toBe('Bonne séance');
    expect(appendDictation('', 'ok')).toBe('Ok');
  });

  it('goes on after a space, with a capital after a full stop only', () => {
    expect(appendDictation('Bonne séance', 'le lâcher était bon')).toBe(
      'Bonne séance le lâcher était bon',
    );
    expect(appendDictation('Bonne séance. ', 'le lâcher était bon')).toBe(
      'Bonne séance. Le lâcher était bon',
    );
  });

  it('keeps the text as it is when nothing was heard', () => {
    expect(appendDictation('Texte', '  ')).toBe('Texte');
  });
});

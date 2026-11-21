/** Appends dictated words to a text: a space between, a capital at the start of a sentence. */
export function appendDictation(text: string | null, words: string): string {
  const said = words.trim();
  if (!said) return text ?? '';
  const capital = said.charAt(0).toUpperCase() + said.slice(1);
  const before = (text ?? '').trimEnd();
  if (!before) return capital;
  return `${before} ${/[.!?]$/.test(before) ? capital : said}`;
}

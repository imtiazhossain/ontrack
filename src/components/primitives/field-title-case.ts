/**
 * Title-case a stacked field label for consistent form chrome.
 * Preserves punctuation, required markers, and hyphen/paren boundaries.
 * Keeps short all-caps acronyms (UI, FX, API) intact.
 * Leaves common short words lowercase unless they start the title.
 */
const TITLE_SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'from',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'the',
  'to',
  'via',
  'with',
]);

const WORD_RE = /[A-Za-z][A-Za-z']*/g;

export function fieldTitleCase(label: string): string {
  const matches = [...label.matchAll(WORD_RE)];
  if (matches.length === 0) return label;
  const firstOffset = matches[0]?.index ?? 0;

  return label.replace(WORD_RE, (word, offset: number) => {
    if (word.length <= 1) return word.toUpperCase();
    if (word.length <= 3 && word === word.toUpperCase()) return word;

    const lower = word.toLowerCase();
    if (offset !== firstOffset && TITLE_SMALL_WORDS.has(lower)) return lower;

    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

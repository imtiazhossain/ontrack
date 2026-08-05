/**
 * Title-case a stacked field label for consistent form chrome.
 * Preserves punctuation, required markers, and hyphen/paren boundaries.
 */
export function fieldTitleCase(label: string): string {
  return label.replace(/[A-Za-z][A-Za-z']*/g, (word) => {
    if (word.length <= 1) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

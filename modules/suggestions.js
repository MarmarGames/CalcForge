/**
 * CalcForge — suggestions.js
 * Maps partial typed strings to autocomplete suggestions.
 * Called on every keypress in the input panel.
 */

const SUGGESTION_MAP = {
  's':    ['sin(', 'sqrt('],
  'si':   ['sin('],
  'sq':   ['sqrt('],
  'c':    ['cos(', 'ceil('],
  'co':   ['cos('],
  'ce':   ['ceil('],
  't':    ['tan('],
  'ta':   ['tan('],
  'l':    ['log(', 'log2(', 'log10(', 'ln('],
  'lo':   ['log(', 'log2(', 'log10('],
  'ln':   ['ln('],
  'a':    ['abs('],
  'ab':   ['abs('],
  'f':    ['floor('],
  'fl':   ['floor('],
  'e':    ['exp('],
  'ex':   ['exp('],
  'r':    ['round('],
  'ro':   ['round('],
  'p':    ['pi'],
  'pi':   ['pi'],
};

/**
 * Given the current expression string, returns an array of suggestion strings.
 * Looks at the last word token to find matches.
 *
 * @param {string} expr - Full expression string from the input
 * @returns {string[]} - Array of suggestion strings (may be empty)
 */
export function getSuggestions(expr) {
  const words = expr.replace(/[^a-z]/gi, ' ').trim().split(/\s+/);
  const last = words[words.length - 1]?.toLowerCase() ?? '';
  return last ? (SUGGESTION_MAP[last] ?? []) : [];
}

/**
 * Applies a chosen suggestion to the current expression.
 * Replaces the trailing partial word with the suggestion.
 *
 * @param {string} expr       - Current expression
 * @param {string} suggestion - The suggestion string to insert
 * @returns {string}          - New expression string
 */
export function applySuggestion(expr, suggestion) {
  const trailingWord = expr.match(/[a-z]+$/i);
  if (trailingWord) {
    return expr.slice(0, expr.length - trailingWord[0].length) + suggestion;
  }
  return expr + suggestion;
}
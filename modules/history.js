/**
 * CalcForge — history.js
 * Manages the calculation history list.
 * Stores up to MAX_ITEMS entries, most recent first.
 * Deduplicates by expression string.
 */

const MAX_ITEMS = 6;

let _history = [];

/**
 * Adds a calculation to history.
 * If the expression already exists, it's moved to the top.
 *
 * @param {string} expr      - The expression string
 * @param {string} formatted - The formatted result string
 */
export function addToHistory(expr, formatted) {
  _history = _history.filter(h => h.expr !== expr);
  _history.unshift({ expr, formatted, timestamp: Date.now() });
  if (_history.length > MAX_ITEMS) _history.pop();
}

/**
 * Returns the current history array (most recent first).
 * @returns {{ expr: string, formatted: string, timestamp: number }[]}
 */
export function getHistory() {
  return [..._history];
}

/**
 * Clears all history.
 */
export function clearHistory() {
  _history = [];
}

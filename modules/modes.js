/**
 * CalcForge — modes.js
 * Manages the active display mode (Learn / Fast / Advanced)
 * and the active angle mode (Degrees / Radians).
 *
 * Display modes:
 *   'learn'    — Full step-by-step breakdown + concept explanations
 *   'fast'     — Answer only, no insight panel content
 *   'advanced' — Steps shown, no concept box (for users who know the theory)
 *
 * Angle modes:
 *   'deg' — Trig inputs treated as degrees (converted to radians internally)
 *   'rad' — Trig inputs treated as radians (passed through unchanged)
 */

const VALID_MODES = ['learn', 'fast', 'advanced'];
const VALID_ANGLE_MODES = ['deg', 'rad'];

let _mode = 'learn';
let _angleMode = 'deg';

/**
 * Sets the active mode.
 * @param {string} mode - One of 'learn', 'fast', 'advanced'
 * @throws if mode is not valid
 */
export function setMode(mode) {
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid mode "${mode}". Must be one of: ${VALID_MODES.join(', ')}`);
  }
  _mode = mode;
}

/**
 * Returns the current active mode string.
 * @returns {string}
 */
export function getMode() {
  return _mode;
}

/**
 * Convenience booleans.
 */
export function isLearnMode()    { return _mode === 'learn'; }
export function isFastMode()     { return _mode === 'fast'; }
export function isAdvancedMode() { return _mode === 'advanced'; }

// ── Angle mode ────────────────────────────────────────────────────────────────

/**
 * Sets the active angle mode.
 * @param {'deg'|'rad'} mode
 */
export function setAngleMode(mode) {
  if (!VALID_ANGLE_MODES.includes(mode)) {
    throw new Error(`Invalid angle mode "${mode}". Must be one of: ${VALID_ANGLE_MODES.join(', ')}`);
  }
  _angleMode = mode;
}

/**
 * Returns the current angle mode.
 * @returns {'deg'|'rad'}
 */
export function getAngleMode() {
  return _angleMode;
}
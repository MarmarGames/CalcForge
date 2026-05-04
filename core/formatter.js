/**
 * CalcForge — formatter.js
 * Converts raw math results into clean, readable strings.
 *
 * Rules:
 *   - Integers under 1e15 → comma-separated (e.g. 1,073,741,824)
 *   - Numbers >= 1e15 or < 0.0001 → scientific notation (e.g. 1.81×10^75)
 *   - Everything else → rounded to 2 decimal places
 */

export function smartFormat(value) {
  let n;

  if (typeof value === 'number') {
    n = value;
  } else if (value && typeof value.toNumber === 'function') {
    n = value.toNumber();
  } else {
    return String(value);
  }

  if (!isFinite(n)) {
    // Overflow from a huge number (e.g. 4^512) — try string representation instead
    if (value && typeof value.toString === 'function') {
      const s = value.toString();
      // If math.js gives us the full decimal, convert to sci notation
      if (/^-?\d+$/.test(s) && s.length > 15) {
        const digits = s.replace('-', '');
        const exp = digits.length - 1;
        const mantissa = parseFloat(digits[0] + '.' + digits.slice(1, 4)).toFixed(2);
        return (n < 0 ? '-' : '') + mantissa + '×10^' + exp;
      }
    }
    return String(n);
  }

  if (Number.isInteger(n) && Math.abs(n) < 1e15) {
    return n.toLocaleString();
  }

  if (Math.abs(n) >= 1e15 || (Math.abs(n) < 0.0001 && n !== 0)) {
    return toSciNotation(n, 2);
  }

  return parseFloat(n.toFixed(2)).toString();
}

/**
 * Converts a number to readable scientific notation.
 * e.g. 1.807e+75 → "1.81×10^75"
 */
function toSciNotation(n, decimalPlaces) {
  const exp = n.toExponential(decimalPlaces);
  return exp
    .replace('e+', '×10^')
    .replace('e-', '×10^-');
}

/**
 * Checks if a math.js result value is actually a number we can display.
 * Rejects raw function objects, strings, arrays, etc.
 */
export function isNumericResult(value) {
  if (typeof value === 'number') return isFinite(value);
  if (value && typeof value === 'object') {
    // Check by constructor name (may be scoped e.g. "Decimal" in some math.js builds)
    const name = value.constructor?.name ?? '';
    if (/^(BigNumber|Fraction|Complex|Decimal)$/i.test(name)) return true;
    // Duck-type: if it has toNumber it's a numeric type
    if (typeof value.toNumber === 'function') return true;
    // math.js ResultSet or similar — check for numeric string representation
    if (typeof value.toString === 'function') {
      const s = value.toString();
      if (/^-?[\d.]+([eE][+-]?\d+)?$/.test(s)) return true;
    }
  }
  return false;
}
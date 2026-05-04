/**
 * CalcForge — evaluator.js
 * Wraps math.js evaluation with:
 *   - Degree-to-radian conversion for trig functions
 *   - log() → log10(), ln() → log() remapping for math.js compatibility
 *   - Incomplete function detection (e.g. bare "sqrt" with no argument)
 *   - Numeric result validation
 *   - Left-associative alternative evaluation for exponent chains
 *   - Fix suggestions for common errors
 */

import { isNumericResult, smartFormat } from './formatter.js';

/** Function names that are valid only when called with arguments */
const INCOMPLETE_FUNCS = /^(sqrt|sin|cos|tan|log|log2|log10|ln|abs|ceil|floor|exp|round)$/i;

const INCOMPLETE_HINTS = {
  sqrt:  'sqrt() needs a number — e.g. sqrt(144)',
  sin:   'sin() needs an angle — e.g. sin(45)',
  cos:   'cos() needs an angle — e.g. cos(60)',
  tan:   'tan() needs an angle — e.g. tan(45)',
  log:   'log() needs a number — e.g. log(1000)  [base 10]',
  log2:  'log2() needs a number — e.g. log2(8)',
  log10: 'log10() needs a number — e.g. log10(100)',
  ln:    'ln() needs a number — e.g. ln(1)  [natural log, base e]',
  abs:   'abs() needs a number — e.g. abs(-5)',
  ceil:  'ceil() needs a number — e.g. ceil(3.2)',
  floor: 'floor() needs a number — e.g. floor(3.9)',
  exp:   'exp() needs a number — e.g. exp(1)',
  round: 'round() needs a number — e.g. round(3.7)',
};

const INCOMPLETE_FIXES = {
  sqrt:  'sqrt()',
  sin:   'sin()',
  cos:   'cos()',
  tan:   'tan()',
  log:   'log()',
  log2:  'log2()',
  log10: 'log10()',
  ln:    'ln()',
  abs:   'abs()',
  ceil:  'ceil()',
  floor: 'floor()',
  exp:   'exp()',
  round: 'round()',
};

/**
 * Rewrites the expression so math.js sees the right functions:
 *   log(x)   -> log10(x)   [user-facing log = base 10; math.js log = natural]
 *   ln(x)    -> log(x)     [math.js log() is the natural log]
 *   log10/log2 are left untouched (math.js supports them natively)
 *
 * Also converts trig args from degrees to radians when angleMode is 'deg'.
 */
function preprocess(expr, angleMode) {
  // Rewrite % as /100 — e.g. 9% → (9/100), 9%*50 → (9/100)*50
  // Must run before other rewrites so it doesn't interfere with log/trig replacements
  let out = expr.replace(/([\d.]+)%/g, '($1/100)');

  // Use __LOG10__ / __LOG2__ as safe sentinels while we rewrite bare log(
  out = out
    .replace(/\blog10\(/g, '__LOG10__(')
    .replace(/\blog2\(/g,  '__LOG2__(')
    .replace(/\blog\(/g,   'log10(')
    .replace(/__LOG10__\(/g, 'log10(')
    .replace(/__LOG2__\(/g,  'log2(')
    .replace(/\bln\(/g,    'log(');

  if (angleMode !== 'rad') {
    out = out
      .replace(/sin\(([^)]+)\)/g, (_, v) => `sin(${v} * pi / 180)`)
      .replace(/cos\(([^)]+)\)/g, (_, v) => `cos(${v} * pi / 180)`)
      .replace(/tan\(([^)]+)\)/g, (_, v) => `tan(${v} * pi / 180)`);
  }

  return out;
}

/**
 * Evaluates a left-associative version of the expression.
 * Only transforms the first chained exponent pattern found.
 * Returns a formatted string, or null if not applicable.
 */
export function evaluateLeftAssoc(expr) {
  try {
    const leftExpr = expr.replace(
      /([\d.]+)\^([\d.]+)\^([\d.]+)/,
      (_, a, b, c) => `(${a}^${b})^${c}`
    );
    if (leftExpr === expr) return null;
    const result = math.evaluate(leftExpr);
    return isNumericResult(result) ? smartFormat(result) : null;
  } catch {
    return null;
  }
}

/**
 * Attempts to detect what part of the expression is "bad".
 */
function detectBadPart(expr, errorMsg) {
  const doubleOp = expr.match(/[+\-*/^]{2,}/);
  if (doubleOp) return { badPart: doubleOp[0] };

  let depth = 0;
  let openIdx = -1;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') { depth++; openIdx = i; }
    if (expr[i] === ')') { depth--; }
    if (depth < 0) return { badPart: expr[i], badIndex: i };
  }
  if (depth > 0 && openIdx >= 0) return { badPart: '(', badIndex: openIdx };

  const trailingOp = expr.match(/[+\-*/^]\s*$/);
  if (trailingOp) return { badPart: trailingOp[0].trim() };

  if (/\^\^/.test(expr)) return { badPart: '^^' };

  return null;
}

/**
 * Attempts to auto-fix a broken expression.
 */
function autoFix(expr, errorMsg) {
  if (/\^\^/.test(expr)) return expr.replace(/\^\^+/g, '^');
  if (/[+\-*/^]\s*$/.test(expr)) return expr.replace(/[+\-*/^]\s*$/, '').trim();

  let depth = 0;
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
  }
  if (depth > 0) return expr + ')'.repeat(depth);
  if (depth < 0) return '(' + expr;

  const fixedOps = expr.replace(/([+\-*/^])\s*[+\-*/^]+/g, '$1');
  if (fixedOps !== expr) return fixedOps;

  return null;
}

/**
 * Highlights the bad part inside the expression by wrapping it in < >
 */
function highlightBad(expr, badPart) {
  if (!badPart) return { highlighted: expr };
  const escaped = badPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const highlighted = expr.replace(new RegExp(escaped), '\u2039' + badPart + '\u203a');
  return { highlighted };
}

/**
 * Main evaluation entry point.
 *
 * @param {string} expr
 * @param {'deg'|'rad'} [angleMode='deg']
 */
export function evaluate(expr, angleMode = 'deg') {
  if (!expr.trim()) return { ok: false, error: 'Empty expression' };

  const trimmed = expr.trim().toLowerCase();

  if (INCOMPLETE_FUNCS.test(trimmed)) {
    const fix = INCOMPLETE_FIXES[trimmed];
    return {
      ok: false,
      error: INCOMPLETE_HINTS[trimmed] ?? `${trimmed}() needs an argument`,
      highlighted: '\u2039' + trimmed + '\u203a',
      fix,
    };
  }

  try {
    const processed = preprocess(expr, angleMode);
    const result = math.evaluate(processed);

    if (!isNumericResult(result)) {
      return {
        ok: false,
        error: `"${expr}" is a function name, not a number — did you mean ${expr}(…)?`,
        highlighted: '\u2039' + expr + '\u203a',
        fix: `${expr}()`,
      };
    }

    return {
      ok: true,
      formatted: smartFormat(result),
      raw: typeof result === 'number' ? result : result.toNumber?.() ?? result,
    };
  } catch (e) {
    let msg = (e.message ?? 'Invalid expression').split('\n')[0];
    if (/unexpected/.test(msg)) msg = 'Syntax error — check your brackets and operators';
    if (/\^\^/.test(expr))      msg = 'Double ^^ is invalid — did you mean ^?';

    const errorMsg = msg.charAt(0).toUpperCase() + msg.slice(1).replace(/\.$/, '');
    const detected = detectBadPart(expr, errorMsg);
    const fix      = autoFix(expr, errorMsg);
    const { highlighted } = detected
      ? highlightBad(expr, detected.badPart)
      : { highlighted: expr };

    return {
      ok: false,
      error: errorMsg,
      highlighted,
      fix,
    };
  }
}
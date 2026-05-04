/**
 * CalcForge — steps.js
 * Generates human-readable step-by-step breakdowns for expressions.
 * Each expression type gets its own handler.
 *
 * Returns an array of: { expr: string, note: string }
 */

import { smartFormat } from './formatter.js';

/**
 * Main entry point — dispatches to the right handler.
 * @param {string} expr
 * @param {'deg'|'rad'} [angleMode='deg']
 */
export function getSteps(expr, angleMode = 'deg') {
  if (isChainedExponent(expr)) return stepsChainedExponent(expr);
  if (isSqrt(expr))            return stepsSqrt(expr);
  if (isParenMultiply(expr))   return stepsParenMultiply(expr);
  if (isTrig(expr))            return stepsTrig(expr, angleMode);
  if (isLn(expr))              return stepsLn(expr);
  if (isLog(expr))             return stepsLog(expr);
  return stepsGeneric(expr, angleMode);
}

/**
 * Returns a concept object { title, text } for the expression,
 * or null if no specific concept applies.
 */
export function getConcept(expr, angleMode = 'deg') {
  if (/\^[\d.]+\^[\d.]+/.test(expr)) return {
    title: 'Right-associativity',
    text:  'When exponents chain (a^b^c), math evaluates right-to-left: a^(b^c). Most basic calculators get this wrong by going left-to-right.',
  };
  if (/sqrt/.test(expr)) return {
    title: 'Square root',
    text:  'sqrt(n) finds x where x² = n. Perfect squares give integers; others are irrational and go on forever.',
  };
  if (/sin|cos|tan/.test(expr)) return {
    title: 'Trig functions',
    text: angleMode === 'deg'
      ? 'sin/cos/tan take an angle and return a ratio. Input is degrees here — converted internally to radians (×π/180) before evaluating.'
      : 'sin/cos/tan take an angle and return a ratio. Input is radians here — passed directly to the trig function with no conversion.',
  };
  if (/\bln\(/.test(expr)) return {
    title: 'Natural Logarithm',
    text:  'ln(x) answers "e to what power = x?" Since e ≈ 2.718, ln(e) = 1 and ln(1) = 0. ln is the inverse of exp().',
  };
  if (/\blog/.test(expr)) return {
    title: 'Logarithm (base 10)',
    text:  'log(x) answers "10 to what power = x?" So log(1000) = 3, because 10³ = 1000. Use ln() for the natural log.',
  };
  if (/\(.*\)/.test(expr)) return {
    title: 'Order of operations',
    text:  'Parentheses always evaluate first, overriding PEMDAS/BODMAS precedence.',
  };
  return null;
}

// ── Type detectors ────────────────────────────────────────────────────────────

function isChainedExponent(expr) { return /[\d.]+\^[\d.]+\^[\d.]+/.test(expr); }
function isSqrt(expr)            { return /sqrt\(\d+\)/.test(expr); }
function isParenMultiply(expr)   { return /\(([^)]+)\)\*(.+)/.test(expr); }
function isTrig(expr)            { return /sin\(|cos\(|tan\(/.test(expr); }
function isLn(expr)              { return /\bln\(/.test(expr); }
function isLog(expr)             { return /\blog10?\(/.test(expr) || /\blog2\(/.test(expr); }

// ── Preprocessor (mirrors evaluator.js preprocess()) ─────────────────────────

function preprocessForEval(expr, angleMode) {
  let out = expr
    .replace(/\blog10\(/g, '__LOG10__(')
    .replace(/\blog2\(/g,  '__LOG2__(')
    .replace(/\blog\(/g,   'log10(')
    .replace(/__LOG10__\(/g, 'log10(')
    .replace(/__LOG2__\(/g,  'log2(')
    .replace(/\bln\(/g,    'log(');

  if (angleMode !== 'rad') {
    out = out
      .replace(/sin\(([^)]+)\)/g, (_, v) => `sin(${v}*pi/180)`)
      .replace(/cos\(([^)]+)\)/g, (_, v) => `cos(${v}*pi/180)`)
      .replace(/tan\(([^)]+)\)/g, (_, v) => `tan(${v}*pi/180)`);
  }
  return out;
}

// ── Step handlers ─────────────────────────────────────────────────────────────

function stepsChainedExponent(expr) {
  const m = expr.match(/([\d.]+)\^([\d.]+)\^([\d.]+)/);
  if (!m) return stepsGeneric(expr);
  const [, a, b, c] = m;
  const inner = Math.pow(parseFloat(b), parseFloat(c));
  const final = Math.pow(parseFloat(a), inner);
  return [
    { expr,                        note: 'Original expression' },
    { expr: `${a}^(${b}^${c})`,   note: 'Right-associative: evaluate innermost exponent first' },
    { expr: `${a}^${inner}`,       note: `${b}^${c} = ${inner}` },
    { expr: smartFormat(final),    note: `${a}^${inner} = ${smartFormat(final)} ✓` },
  ];
}

function stepsSqrt(expr) {
  const m = expr.match(/sqrt\((\d+)\)/);
  const n = parseInt(m[1]);
  const r = Math.sqrt(n);
  return [
    { expr,                 note: 'Original expression' },
    { expr: `√${n}`,        note: 'sqrt() means square root' },
    { expr: smartFormat(r), note: `Find x where x² = ${n}` },
  ];
}

function stepsParenMultiply(expr) {
  const m = expr.match(/\(([^)]+)\)\*(.+)/);
  if (!m) return stepsGeneric(expr);
  try {
    const inner = math.evaluate(m[1]);
    const right = math.evaluate(m[2]);
    return [
      { expr,                             note: 'Original expression' },
      { expr: `${inner} * ${m[2]}`,       note: `Parentheses first: (${m[1]}) = ${inner}` },
      { expr: smartFormat(inner * right), note: `${inner} × ${right} = ${smartFormat(inner * right)}` },
    ];
  } catch { return stepsGeneric(expr); }
}

function stepsTrig(expr, angleMode) {
  const degMatch = expr.match(/(sin|cos|tan)\(([^)]+)\)/);
  if (!degMatch) return stepsGeneric(expr, angleMode);
  const [, fn, angle] = degMatch;
  let angleVal;
  try { angleVal = math.evaluate(angle); } catch { return stepsGeneric(expr, angleMode); }

  if (angleMode === 'rad') {
    const result = Math[fn](angleVal);
    const angleLabel = (String(angleVal) !== angle)
      ? `${angle} = ${smartFormat(angleVal)} rad`
      : `${smartFormat(angleVal)} rad`;
    return [
      { expr,                          note: 'Original expression — input is in radians' },
      { expr: `${fn}(${angleLabel})`,  note: 'Angle passed directly, no conversion needed' },
      { expr: smartFormat(result),     note: `${fn}(${smartFormat(angleVal)}) = ${smartFormat(result)}` },
    ];
  }

  const rad = angleVal * Math.PI / 180;
  const result = Math[fn](rad);
  const angleLabel = (String(angleVal) !== angle)
    ? `${angle} = ${smartFormat(angleVal)}°`
    : `${smartFormat(angleVal)}°`;
  return [
    { expr,                                                    note: 'Original expression' },
    { expr: `${fn}(${angleLabel} → ${smartFormat(rad)} rad)`, note: 'Convert degrees to radians: angle × π / 180' },
    { expr: smartFormat(result),                               note: `${fn}(${smartFormat(rad)}) = ${smartFormat(result)}` },
  ];
}

function stepsLog(expr) {
  const m = expr.match(/\b(log10|log2|log)\(([^)]+)\)/);
  if (!m) return stepsGeneric(expr);
  const [, fn, arg] = m;
  let argVal;
  try { argVal = math.evaluate(arg); } catch { return stepsGeneric(expr); }
  const baseStr = fn === 'log2' ? '2' : '10';
  const result  = fn === 'log2' ? Math.log2(argVal) : Math.log10(argVal);
  return [
    { expr,                              note: 'Original expression' },
    { expr: `log base ${baseStr}(${argVal})`, note: `log() means base-${baseStr} logarithm` },
    { expr: `${baseStr}^? = ${argVal}`,  note: `Ask: "${baseStr} to what power equals ${argVal}?"` },
    { expr: smartFormat(result),         note: `${fn}(${argVal}) = ${smartFormat(result)}` },
  ];
}

function stepsLn(expr) {
  const m = expr.match(/\bln\(([^)]+)\)/);
  if (!m) return stepsGeneric(expr);
  let argVal;
  try { argVal = math.evaluate(m[1]); } catch { return stepsGeneric(expr); }
  const result = Math.log(argVal);
  return [
    { expr,                      note: 'Original expression' },
    { expr: `loge(${argVal})`,   note: 'ln() means natural log — base is e ≈ 2.71828' },
    { expr: `e^? = ${argVal}`,   note: `Ask: "e to what power equals ${argVal}?"` },
    { expr: smartFormat(result), note: `ln(${argVal}) = ${smartFormat(result)}` },
  ];
}

function stepsGeneric(expr, angleMode) {
  try {
    const processed = preprocessForEval(expr, angleMode);
    const result = math.evaluate(processed);
    if (typeof result === 'number' || typeof result?.toNumber === 'function') {
      return [
        { expr,                      note: 'Expression' },
        { expr: smartFormat(result), note: 'Result' },
      ];
    }
  } catch { /* fall through */ }
  return [];
}
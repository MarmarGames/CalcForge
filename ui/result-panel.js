/**
 * CalcForge — ui/result-panel.js
 * Controls the center panel: answer display, associativity toggle,
 * ambiguity warnings, angle mode, unit circle.
 */

import { evaluateLeftAssoc } from '../core/evaluator.js';
import { getAngleMode, setAngleMode } from '../modules/modes.js';

let _assoc = 'right';
let _onAssocChange = null;
let _onAngleChange = null;

/**
 * Initialises result panel event listeners.
 * @param {object} callbacks
 * @param {function} callbacks.onAssocChange  - Called with ('left'|'right') on assoc toggle
 * @param {function} [callbacks.onAngleChange] - Called with ('deg'|'rad') on angle toggle
 */
export function initResultPanel({ onAssocChange, onAngleChange }) {
  _onAssocChange = onAssocChange;
  _onAngleChange = onAngleChange ?? null;

  document.getElementById('btn-right')?.addEventListener('click', () => setAssoc('right'));
  document.getElementById('btn-left')?.addEventListener('click',  () => setAssoc('left'));

  document.getElementById('btn-deg')?.addEventListener('click', () => _setAngle('deg'));
  document.getElementById('btn-rad')?.addEventListener('click', () => _setAngle('rad'));

  requestAnimationFrame(() => _syncAnglePill(getAngleMode()));
  _updateAngleLegend(getAngleMode());
  _updateCircleLabels(getAngleMode());
}

/**
 * Renders a successful numeric result.
 * @param {string} formatted - Display string (assoc-adjusted by app.js)
 * @param {string} expr      - Original expression
 * @param {'left'|'right'} [assoc='right']
 */
export function showResult(formatted, expr, assoc = 'right') {
  const num = document.getElementById('result-num');
  num.textContent = formatted;
  num.className = 'result-num';
  document.getElementById('result-expr').textContent = expr;

  if (assoc === 'right') {
    updateAmbiguity(expr, formatted);
  } else {
    // Left mode: main result is already the left value — just hide warnings
    hideAmbiguity();
  }

  hideFixBtn();
}

/**
 * Renders an error state in the result panel.
 */
export function showError(message, expr, fix, onFix) {
  const num = document.getElementById('result-num');
  num.textContent = 'ERROR';
  num.className = 'result-num is-error';
  document.getElementById('result-expr').textContent = message;
  hideAmbiguity();

  if (fix && onFix) {
    showFixBtn(fix, onFix);
  } else {
    hideFixBtn();
  }
}

/**
 * Returns the current associativity setting.
 * @returns {'left'|'right'}
 */
export function getAssoc() {
  return _assoc;
}

// ── Associativity ─────────────────────────────────────────────────────────────

function setAssoc(assoc) {
  _assoc = assoc;
  document.getElementById('btn-right')?.classList.toggle('active', assoc === 'right');
  document.getElementById('btn-left')?.classList.toggle('active',  assoc === 'left');
  if (_onAssocChange) _onAssocChange(assoc);
}

// ── Ambiguity detection ───────────────────────────────────────────────────────

function hasChainedExponent(expr) {
  return /[\d.]+\^[\d.]+\^[\d.]+/.test(expr);
}

/**
 * Shows a warning when an expression has a plausible alternative interpretation.
 * Case 1 — chained exponents a^b^c: right-assoc (standard) vs left-assoc
 * Case 2 — division+multiplication a/b*c: left-to-right vs implicit grouping
 */
function updateAmbiguity(expr, mainResult) {
  const section = document.getElementById('ambiguity-section');
  const box     = document.getElementById('amb-box');

  // ── Case 1: chained exponents ──────────────────────────────────────────────
  if (hasChainedExponent(expr)) {
    const altResult = evaluateLeftAssoc(expr);
    if (altResult && altResult !== mainResult) {
      if (section && box) {
        box.innerHTML = `
          <strong>Exponent ambiguity</strong>
          Standard (right-to-left): <b>a^(b^c)</b> = ${esc(mainResult)}<br>
          Left-to-right: <b>(a^b)^c</b> = <span class="amb-alt">${esc(altResult)}</span>`;
        section.style.display = '';
      }
      return;
    }
  }

  // ── Case 2: division followed by multiplication ────────────────────────────
  if (/[\d.]+\s*\/\s*[\d.]+\s*\*\s*[\d.]+/.test(expr)) {
    try {
      const altExpr = expr.replace(
        /([\d.]+)\s*\/\s*([\d.]+\s*\*\s*[\d.]+)/,
        (_, a, rest) => `${a} / (${rest})`
      );
      if (altExpr !== expr) {
        const altRaw = math.evaluate(altExpr);
        const altFormatted = String(
          parseFloat((altRaw.toNumber ? altRaw.toNumber() : altRaw).toFixed(10))
        ).replace(/\.?0+$/, '');
        if (altFormatted !== mainResult) {
          if (section && box) {
            box.innerHTML = `
              <strong>Division ambiguity</strong>
              Left-to-right (standard): ${esc(mainResult)}<br>
              With implicit grouping <b>${esc(altExpr)}</b>: <span class="amb-alt">${esc(altFormatted)}</span>`;
            section.style.display = '';
          }
          return;
        }
      }
    } catch { /* ignore */ }
  }

  hideAmbiguity();
}

function hideAmbiguity() {
  const section = document.getElementById('ambiguity-section');
  if (section) section.style.display = 'none';
}

// ── Fix button ────────────────────────────────────────────────────────────────

function showFixBtn(fix, onFix) {
  let btn = document.getElementById('result-fix-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'result-fix-btn';
    btn.className = 'fix-btn fix-btn--result';
    const resultArea = document.querySelector('.result-area');
    if (resultArea) resultArea.insertAdjacentElement('afterend', btn);
    else document.getElementById('result-num')?.parentElement?.appendChild(btn);
  }
  const fresh = btn.cloneNode(false);
  fresh.innerHTML = `<span class="fix-btn-icon">⚡</span> FIX IT`;
  btn.replaceWith(fresh);
  fresh.addEventListener('click', () => onFix(fix));
  fresh.style.display = 'inline-flex';
}

function hideFixBtn() {
  const btn = document.getElementById('result-fix-btn');
  if (btn) btn.style.display = 'none';
}

// ── Angle mode ────────────────────────────────────────────────────────────────

function _setAngle(mode) {
  setAngleMode(mode);
  _syncAnglePill(mode);
  _updateAngleLegend(mode);
  _updateCircleLabels(mode);
  hideActivePoint();
  if (_onAngleChange) _onAngleChange(mode);
}

function _syncAnglePill(mode) {
  const pill = document.getElementById('angle-pill');
  const btn  = document.getElementById(mode === 'deg' ? 'btn-deg' : 'btn-rad');
  if (!pill || !btn) return;
  pill.style.left  = btn.offsetLeft + 'px';
  pill.style.width = btn.offsetWidth + 'px';
  document.getElementById('btn-deg')?.classList.toggle('active', mode === 'deg');
  document.getElementById('btn-rad')?.classList.toggle('active', mode === 'rad');
}

function _updateAngleLegend(mode) {
  const el = document.getElementById('angle-legend');
  if (!el) return;
  el.textContent = mode === 'deg'
    ? 'Trig functions use 360° for a full circle.'
    : 'Trig functions use 2π for a full circle.';
}

const _DEG_LABELS = ['0°', '90°', '180°', '270°'];
const _RAD_LABELS = ['0', 'π/2', 'π', '3π/2'];

function _updateCircleLabels(mode) {
  const labels = mode === 'deg' ? _DEG_LABELS : _RAD_LABELS;
  ['uc-0', 'uc-90', 'uc-180', 'uc-270'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = labels[i];
  });
}

export function showAnglePoint(angleDeg, label) {
  const cx = 74, cy = 74, r = 54;
  const rad = (angleDeg % 360) * Math.PI / 180;
  const x = cx + r * Math.cos(-rad);
  const y = cy + r * Math.sin(-rad);
  const pt    = document.getElementById('uc-point');
  const ln    = document.getElementById('uc-line');
  const arc   = document.getElementById('uc-arc');
  const badge = document.getElementById('uc-badge');
  if (pt) { pt.setAttribute('cx', x); pt.setAttribute('cy', y); pt.setAttribute('opacity', '1'); }
  if (ln) { ln.setAttribute('x2', x); ln.setAttribute('y2', y); ln.setAttribute('opacity', '1'); }
  if (arc) {
    if (Math.abs(angleDeg % 360) > 2) {
      arc.setAttribute('d', _arcPath(cx, cy, 14, 0, angleDeg % 360));
      arc.setAttribute('opacity', '0.4');
    } else {
      arc.setAttribute('opacity', '0');
    }
  }
  if (badge) { badge.textContent = label; badge.style.display = 'block'; }
}

export function hideActivePoint() {
  ['uc-point', 'uc-line', 'uc-arc'].forEach(id => {
    document.getElementById(id)?.setAttribute('opacity', '0');
  });
  const badge = document.getElementById('uc-badge');
  if (badge) badge.style.display = 'none';
}

function _arcPath(cx, cy, r, startDeg, endDeg) {
  function pt(deg) {
    const a = deg * Math.PI / 180;
    return { x: cx + r * Math.cos(-a), y: cy + r * Math.sin(-a) };
  }
  const s = pt(startDeg);
  const e = pt(endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
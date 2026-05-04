/**
 * CalcForge — ui/insight-panel.js
 * Controls the right panel: step-by-step breakdown, concept box, warning box, error box.
 * Output changes based on the current mode (learn / fast / advanced).
 *
 * Error display now supports:
 *   - Underlined bad fragment (‹…› markers from evaluator)
 *   - FIX IT button that loads the corrected expression
 */

import { getSteps, getConcept } from '../core/steps.js';
import { getMode } from '../modules/modes.js';

/**
 * Renders insight content for a successfully evaluated expression.
 * @param {string} expr - The expression that was evaluated
 * @param {'deg'|'rad'} [angleMode='deg']
 */
export function renderInsight(expr, angleMode = 'deg') {
  const panel = document.getElementById('insight-panel');
  const mode  = getMode();

  if (mode === 'fast') {
    panel.innerHTML = `<div class="fast-msg">Fast mode — switch to Learn for step-by-step</div>`;
    return;
  }

  const steps   = getSteps(expr, angleMode);
  const concept = getConcept(expr, angleMode);
  const hasAlt  = /\d+\^\d+\^\d+/.test(expr);

  let html = '';

  if (steps.length) {
    html += `<div>
      <div class="sec-label">Step-by-step</div>
      <div class="step-list">
        ${steps.map((s, i) => `
          <div class="step-row">
            <div class="step-num">${i + 1}</div>
            <div>
              <div class="step-expr">${escapeHtml(s.expr)}</div>
              <div class="step-note">${escapeHtml(s.note)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  if (concept && mode === 'learn') {
    html += `<div class="concept-box">
      <div class="concept-title">${escapeHtml(concept.title)}</div>
      <div class="concept-text">${escapeHtml(concept.text)}</div>
    </div>`;
  }

  if (hasAlt) {
    html += `<div class="warn-box">
      <div class="warn-title">Common mistake</div>
      <div class="warn-text">
        Many calculators evaluate exponent chains left-to-right and get the wrong answer.
        CalcForge uses the correct right-associative convention and shows both values.
      </div>
    </div>`;
  }

  panel.innerHTML = html || `<div class="fast-msg">No insight available for this expression</div>`;
}

/**
 * Renders an error state in the insight panel.
 * @param {string} message     - Human-readable error
 * @param {string} [highlighted] - Expression string with ‹bad› markers
 * @param {string} [fix]         - Suggested corrected expression (for FIX IT button)
 * @param {function} [onFix]     - Callback invoked with the fixed expression when FIX IT clicked
 */
export function renderInsightError(message, highlighted, fix, onFix) {
  const panel = document.getElementById('insight-panel');

  // Build the highlighted expression HTML (‹…› → underline span)
  const exprHtml = highlighted
    ? highlighted
        .split(/(‹[^›]*›)/g)
        .map(part => {
          if (part.startsWith('‹') && part.endsWith('›')) {
            return `<span class="err-underline">${escapeHtml(part.slice(1, -1))}</span>`;
          }
          return escapeHtml(part);
        })
        .join('')
    : '';

  const fixBtnHtml = fix
    ? `<button class="fix-btn" id="insight-fix-btn" data-fix="${escapeAttr(fix)}">
        <span class="fix-btn-icon">⚡</span> FIX IT
       </button>`
    : '';

  panel.innerHTML = `
    <div class="err-box">
      <div class="err-title">Error</div>
      ${exprHtml ? `<div class="err-expr">${exprHtml}</div>` : ''}
      <div class="err-text">${escapeHtml(message)}</div>
      ${fixBtnHtml}
    </div>`;

  if (fix && onFix) {
    const btn = document.getElementById('insight-fix-btn');
    if (btn) {
      btn.addEventListener('click', () => onFix(fix));
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
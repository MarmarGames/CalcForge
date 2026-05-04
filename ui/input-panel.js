/**
 * CalcForge — ui/input-panel.js
 * Controls the left panel: expression editor, suggestions, quick-insert buttons, history.
 */

import { getSuggestions, applySuggestion } from '../modules/suggestions.js';
import { getHistory } from '../modules/history.js';

/**
 * Initialises input panel event listeners.
 * @param {object} callbacks
 * @param {function} callbacks.onExprChange - Called with (expr: string) on every change
 * @param {function} callbacks.onSubmit     - Called with (expr: string) on Enter key
 * @param {function} callbacks.onHistoryLoad - Called with (expr: string) when history item clicked
 */
export function initInputPanel({ onExprChange, onSubmit, onHistoryLoad }) {
  const input = document.getElementById('expr-input');

  input.addEventListener('input', () => {
    const expr = input.value;
    renderSuggestions(expr, (suggestion) => {
      input.value = applySuggestion(expr, suggestion);
      input.focus();
      onExprChange(input.value);
    });
    onExprChange(expr);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onSubmit(input.value);
  });

  document.querySelectorAll('.qb[data-insert]').forEach(btn => {
    btn.addEventListener('click', () => {
      insertAtCursor(input, btn.dataset.insert);
      onExprChange(input.value);
    });
  });

  renderHistory(onHistoryLoad);
}

/**
 * Sets the input field value programmatically (e.g. loading from history).
 * @param {string} expr
 */
export function setInputValue(expr) {
  document.getElementById('expr-input').value = expr;
}

/**
 * Re-renders the history list.
 * @param {function} onHistoryLoad - Called with (expr) on item click
 */
export function renderHistory(onHistoryLoad) {
  const list = document.getElementById('hist-list');
  const items = getHistory();

  if (!items.length) {
    list.innerHTML = '<div style="font-size:11px;color:var(--cf-text3);padding:4px 0">No history yet</div>';
    return;
  }

  list.innerHTML = items.map(h => `
    <div class="hist-item" data-expr="${escapeAttr(h.expr)}">
      <span>${escapeHtml(h.expr)}</span>
      <span class="hist-ans">${escapeHtml(h.formatted)}</span>
    </div>
  `).join('');

  list.querySelectorAll('.hist-item').forEach(item => {
    item.addEventListener('click', () => onHistoryLoad(item.dataset.expr));
  });
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function insertAtCursor(input, text) {
  const pos = input.selectionStart;
  input.value = input.value.slice(0, pos) + text + input.value.slice(pos);
  input.focus();
  input.setSelectionRange(pos + text.length, pos + text.length);
}

function renderSuggestions(expr, onPick) {
  const bar = document.getElementById('sugg-bar');
  const hits = getSuggestions(expr);

  if (!hits.length) { bar.innerHTML = ''; return; }

  bar.innerHTML = 'Try: ' + hits.map(h =>
    `<span class="schip" data-sug="${escapeAttr(h)}">${escapeHtml(h)}</span>`
  ).join('');

  bar.querySelectorAll('.schip').forEach(chip => {
    chip.addEventListener('click', () => onPick(chip.dataset.sug));
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

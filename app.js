/**
 * CalcForge — app.js
 * Main entry point. Wires all modules and UI panels together.
 */

import { evaluate, evaluateLeftAssoc }        from './core/evaluator.js';
import { addToHistory }                        from './modules/history.js';
import { setMode, getMode, getAngleMode }      from './modules/modes.js';
import { initInputPanel, setInputValue, renderHistory } from './ui/input-panel.js';
import { initResultPanel, showResult, showError, showAnglePoint, hideActivePoint, getAssoc } from './ui/result-panel.js';
import { renderInsight, renderInsightError }   from './ui/insight-panel.js';

const DEFAULT_EXPR = '2^3^2';

// ── Boot ──────────────────────────────────────────────────────────────────────

initInputPanel({
  onExprChange:  (expr) => run(expr),
  onSubmit:      (expr) => run(expr),
  onHistoryLoad: (expr) => { setInputValue(expr); run(expr); },
});

initResultPanel({
  onAssocChange: () => run(document.getElementById('expr-input').value),
  onAngleChange: () => run(document.getElementById('expr-input').value),
});

wireModeBtns();
run(DEFAULT_EXPR);

// ── Core run loop ─────────────────────────────────────────────────────────────

function run(expr) {
  if (!expr.trim()) return;

  const angleMode = getAngleMode();
  const assoc     = getAssoc();
  const result    = evaluate(expr, angleMode);

  if (result.ok) {
    // Only swap in left-assoc result for chained exponents — the toggle has
    // no mathematical meaning for +, -, *, / expressions.
    const hasChainedExp = /[\d.]+\^[\d.]+\^[\d.]+/.test(expr);
    let displayFormatted = result.formatted;
    if (assoc === 'left' && hasChainedExp) {
      const leftFormatted = evaluateLeftAssoc(expr);
      if (leftFormatted) displayFormatted = leftFormatted;
    }

    showResult(displayFormatted, expr, assoc);
    addToHistory(expr, result.formatted);
    renderHistory((e) => { setInputValue(e); run(e); });
    renderInsight(expr, angleMode);
    updateUnitCircle(expr, angleMode);
  } else {
    showError(result.error, expr);
    renderInsightError(result.error);
    hideActivePoint();
  }
}

// ── Unit circle ───────────────────────────────────────────────────────────────

function updateUnitCircle(expr, angleMode) {
  const match = expr.match(/(sin|cos|tan)\(([^)]+)\)/i);
  if (!match) { hideActivePoint(); return; }

  let angleVal;
  try { angleVal = math.evaluate(match[2]); }
  catch { hideActivePoint(); return; }

  if (typeof angleVal !== 'number' || !isFinite(angleVal)) { hideActivePoint(); return; }

  const angleDeg = angleMode === 'rad' ? angleVal * (180 / Math.PI) : angleVal;
  const angleRad = angleMode === 'rad' ? angleVal : angleVal * (Math.PI / 180);
  const degStr   = parseFloat(angleDeg.toFixed(4)).toString();
  const radStr   = parseFloat(angleRad.toFixed(4)).toString();
  const label    = angleMode === 'deg' ? `${degStr}° / ${radStr} rad` : `${radStr} rad / ${degStr}°`;

  showAnglePoint(angleDeg, label);
}

// ── Mode buttons ──────────────────────────────────────────────────────────────

function wireModeBtns() {
  document.querySelectorAll('.mbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setMode(btn.dataset.mode);
      renderInsight(document.getElementById('expr-input').value, getAngleMode());
    });
  });
}
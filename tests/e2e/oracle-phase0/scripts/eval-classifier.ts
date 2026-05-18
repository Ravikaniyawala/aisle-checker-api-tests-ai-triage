/**
 * P0.3 driver — evaluates the ARIA-aware locator-drift classifier against
 * the hand-crafted + synthetic dataset.
 *
 * Outputs reports/classifier-eval.json with per-sub-kind accuracy and
 * a confusion matrix the phase0-report aggregator can render.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { classifyLocatorDrift } from '../src/locator-drift-classifier.ts';
import { parseLocatorExpression } from '../src/locator-parser.ts';
import {
  HAND_CRAFTED_CASES,
  ALL_DRIFT_CASES,
  type DriftCase,
} from '../fixtures/drift-cases.ts';
import type { LocatorDriftKind } from '../src/types.ts';

interface KindStats {
  total:        number;
  correct:      number;
  incorrect:    number;
  unclassified: number;
  accuracy:     number;
}

interface CaseEvalResult {
  id:        string;
  expected:  LocatorDriftKind;
  actual:    LocatorDriftKind | null;
  confidence: number;
  ok:        boolean;
  rationale: string;
  reasoning: string;
}

function evaluateCases(cases: DriftCase[]): {
  byKind: Record<LocatorDriftKind, KindStats>;
  confusion: Record<string, Record<string, number>>;
  details: CaseEvalResult[];
  overall: KindStats;
} {
  const byKind: Record<LocatorDriftKind, KindStats> = {
    locator_drift_data_testid_only:  { total: 0, correct: 0, incorrect: 0, unclassified: 0, accuracy: 0 },
    locator_drift_css_class_only:    { total: 0, correct: 0, incorrect: 0, unclassified: 0, accuracy: 0 },
    locator_drift_user_visible_text: { total: 0, correct: 0, incorrect: 0, unclassified: 0, accuracy: 0 },
    locator_drift_dom_structure:     { total: 0, correct: 0, incorrect: 0, unclassified: 0, accuracy: 0 },
  };

  const confusion: Record<string, Record<string, number>> = {};
  const details: CaseEvalResult[] = [];

  for (const c of cases) {
    const parsed = parseLocatorExpression(c.locatorExpression);
    if (!parsed) {
      byKind[c.expectedKind].total++;
      byKind[c.expectedKind].unclassified++;
      details.push({
        id: c.id, expected: c.expectedKind, actual: null, confidence: 0,
        ok: false, rationale: c.rationale,
        reasoning: 'parser returned null for locator expression',
      });
      continue;
    }

    const classification = classifyLocatorDrift({
      failingLocator: parsed,
      ariaSnapshot:   c.ariaSnapshot,
      testAttributeNames: c.testAttributeNames,
    });

    byKind[c.expectedKind].total++;
    const ok = classification.kind === c.expectedKind;
    if (ok) byKind[c.expectedKind].correct++;
    else if (classification.kind === null) byKind[c.expectedKind].unclassified++;
    else byKind[c.expectedKind].incorrect++;

    confusion[c.expectedKind] ??= {};
    const actualLabel = classification.kind ?? '__null__';
    confusion[c.expectedKind][actualLabel] = (confusion[c.expectedKind][actualLabel] ?? 0) + 1;

    details.push({
      id:         c.id,
      expected:   c.expectedKind,
      actual:     classification.kind,
      confidence: classification.confidence,
      ok,
      rationale:  c.rationale,
      reasoning:  classification.reasoning,
    });
  }

  for (const k of Object.keys(byKind) as LocatorDriftKind[]) {
    byKind[k].accuracy = byKind[k].total === 0 ? 0 : byKind[k].correct / byKind[k].total;
  }

  const overall: KindStats = {
    total:        details.length,
    correct:      details.filter(d => d.ok).length,
    incorrect:    details.filter(d => !d.ok && d.actual !== null).length,
    unclassified: details.filter(d => d.actual === null).length,
    accuracy:     details.length === 0 ? 0 : details.filter(d => d.ok).length / details.length,
  };

  return { byKind, confusion, details, overall };
}

console.log('[phase0] evaluating classifier on hand-crafted cases…');
const handCrafted = evaluateCases(HAND_CRAFTED_CASES);

console.log('[phase0] evaluating classifier on hand-crafted + synthetic cases…');
const full = evaluateCases(ALL_DRIFT_CASES);

const report = {
  handCrafted: {
    total:    handCrafted.overall.total,
    byKind:   handCrafted.byKind,
    overall:  handCrafted.overall,
    confusion: handCrafted.confusion,
    failures: handCrafted.details.filter(d => !d.ok),
  },
  fullSet: {
    total:    full.overall.total,
    byKind:   full.byKind,
    overall:  full.overall,
    confusion: full.confusion,
    failures: full.details.filter(d => !d.ok).slice(0, 30),  // cap noise
  },
};

const outPath = resolve(import.meta.dirname, '..', 'reports', 'classifier-eval.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log();
console.log('=== Hand-crafted cases ===');
for (const [kind, stats] of Object.entries(handCrafted.byKind)) {
  const pct = (stats.accuracy * 100).toFixed(1);
  console.log(`  ${kind.padEnd(40)} ${stats.correct}/${stats.total}  (${pct}%)`);
}
console.log(`  ${'OVERALL'.padEnd(40)} ${handCrafted.overall.correct}/${handCrafted.overall.total}  (${(handCrafted.overall.accuracy * 100).toFixed(1)}%)`);

console.log();
console.log('=== Hand-crafted + synthetic (full set) ===');
for (const [kind, stats] of Object.entries(full.byKind)) {
  const pct = (stats.accuracy * 100).toFixed(1);
  console.log(`  ${kind.padEnd(40)} ${stats.correct}/${stats.total}  (${pct}%)`);
}
console.log(`  ${'OVERALL'.padEnd(40)} ${full.overall.correct}/${full.overall.total}  (${(full.overall.accuracy * 100).toFixed(1)}%)`);

console.log();
console.log(`[phase0] report → ${outPath}`);

// Exit 0 always — the report says PASS/FAIL.
process.exit(0);

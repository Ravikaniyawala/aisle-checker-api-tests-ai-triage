import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyLocatorDrift } from '../src/locator-drift-classifier.ts';
import { parseLocatorExpression } from '../src/locator-parser.ts';
import {
  HAND_CRAFTED_CASES,
  ALL_DRIFT_CASES,
} from '../fixtures/drift-cases.ts';
import type { LocatorDriftKind } from '../src/types.ts';

describe('classifyLocatorDrift — basic shape', () => {
  it('returns null kind on empty ARIA snapshot', () => {
    const r = classifyLocatorDrift({
      failingLocator: { raw: 'getByTestId(x)', kind: 'getByTestId', value: 'x', confidence: 0.95 },
      ariaSnapshot:   [],
    });
    assert.equal(r.kind, null);
    assert.equal(r.confidence, 0);
  });

  it('detects user-visible text drift for getByRole + name change', () => {
    const r = classifyLocatorDrift({
      failingLocator: parseLocatorExpression(`getByRole('button', { name: 'Checkout' })`)!,
      ariaSnapshot:   [{ role: 'button', name: 'Place Order' }],
    });
    assert.equal(r.kind, 'locator_drift_user_visible_text');
    assert.ok(r.confidence >= 0.8);
  });

  it('detects data-testid-only drift', () => {
    const r = classifyLocatorDrift({
      failingLocator: parseLocatorExpression(`getByTestId('product-list')`)!,
      ariaSnapshot:   [{
        role: 'list',
        name: 'Products',
        testAttributes: { 'data-test': 'products-list' },
      }],
    });
    assert.equal(r.kind, 'locator_drift_data_testid_only');
  });

  it('detects CSS-class drift', () => {
    const r = classifyLocatorDrift({
      failingLocator: parseLocatorExpression(`locator('.product-card')`)!,
      ariaSnapshot:   [{ role: 'article', name: 'Card', classes: ['product-tile'] }],
    });
    assert.equal(r.kind, 'locator_drift_css_class_only');
  });

  it('detects DOM-structure drift for nth-child selector', () => {
    const r = classifyLocatorDrift({
      failingLocator: parseLocatorExpression(`locator('ul > li:nth-child(2)')`)!,
      ariaSnapshot:   [{ role: 'listitem', name: 'Item' }],
    });
    assert.equal(r.kind, 'locator_drift_dom_structure');
  });
});

describe('classifyLocatorDrift — accuracy contract (P0.3)', () => {
  function evalCases(cases: typeof HAND_CRAFTED_CASES, label: string) {
    const byKind: Record<LocatorDriftKind, { correct: number; total: number }> = {
      locator_drift_data_testid_only:  { correct: 0, total: 0 },
      locator_drift_css_class_only:    { correct: 0, total: 0 },
      locator_drift_user_visible_text: { correct: 0, total: 0 },
      locator_drift_dom_structure:     { correct: 0, total: 0 },
    };

    const failures: string[] = [];
    for (const c of cases) {
      const parsed = parseLocatorExpression(c.locatorExpression);
      if (!parsed) {
        byKind[c.expectedKind].total++;
        failures.push(`${c.id}: parser returned null`);
        continue;
      }
      const classification = classifyLocatorDrift({
        failingLocator: parsed,
        ariaSnapshot:   c.ariaSnapshot,
        testAttributeNames: c.testAttributeNames,
      });
      byKind[c.expectedKind].total++;
      if (classification.kind === c.expectedKind) {
        byKind[c.expectedKind].correct++;
      } else {
        failures.push(
          `${c.id}: expected ${c.expectedKind}, got ${classification.kind ?? 'null'} — ${classification.reasoning}`,
        );
      }
    }

    console.log(`[classifier-${label}]`);
    for (const [k, s] of Object.entries(byKind)) {
      const pct = s.total === 0 ? 0 : (s.correct / s.total) * 100;
      console.log(`  ${k.padEnd(40)} ${s.correct}/${s.total}  (${pct.toFixed(1)}%)`);
    }
    if (failures.length > 0) {
      console.log(`  failures (first 10):`);
      for (const f of failures.slice(0, 10)) console.log(`    - ${f}`);
    }
    return byKind;
  }

  it('hand-crafted: ≥85% per sub-kind', () => {
    const stats = evalCases(HAND_CRAFTED_CASES, 'hand-crafted');
    for (const [kind, s] of Object.entries(stats)) {
      const acc = s.total === 0 ? 0 : s.correct / s.total;
      assert.ok(
        acc >= 0.85,
        `Hand-crafted ${kind}: ${(acc * 100).toFixed(1)}% < 85%`,
      );
    }
  });

  it('full set (hand-crafted + synthetic): ≥85% per sub-kind', () => {
    const stats = evalCases(ALL_DRIFT_CASES, 'full');
    for (const [kind, s] of Object.entries(stats)) {
      const acc = s.total === 0 ? 0 : s.correct / s.total;
      assert.ok(
        acc >= 0.85,
        `Full set ${kind}: ${(acc * 100).toFixed(1)}% < 85%`,
      );
    }
  });
});

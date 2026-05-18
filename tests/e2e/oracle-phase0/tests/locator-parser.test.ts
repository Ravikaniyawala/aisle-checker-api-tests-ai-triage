import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseFailingLocator, parseLocatorExpression } from '../src/locator-parser.ts';
import { ERROR_FIXTURES } from '../fixtures/playwright-errors.ts';

describe('parseFailingLocator', () => {
  it('returns null for empty/null/undefined input', () => {
    assert.equal(parseFailingLocator(''), null);
    // @ts-expect-error testing null safety
    assert.equal(parseFailingLocator(null), null);
    // @ts-expect-error
    assert.equal(parseFailingLocator(undefined), null);
  });

  it('extracts getByTestId value with single quotes', () => {
    const r = parseFailingLocator("waiting for getByTestId('product-list')");
    assert.ok(r);
    assert.equal(r.kind, 'getByTestId');
    assert.equal(r.value, 'product-list');
    assert.equal(r.testAttribute, 'data-testid');
  });

  it('extracts getByTestId value with double quotes', () => {
    const r = parseFailingLocator('waiting for getByTestId("nav-products")');
    assert.ok(r);
    assert.equal(r.value, 'nav-products');
  });

  it('extracts getByRole with name option', () => {
    const r = parseFailingLocator("getByRole('button', { name: 'Checkout' })");
    assert.ok(r);
    assert.equal(r.kind, 'getByRole');
    assert.equal(r.value, 'button:Checkout');
  });

  it('extracts attribute selector with data-test', () => {
    const r = parseFailingLocator(`locator('[data-test="store-card"]')`);
    assert.ok(r);
    assert.equal(r.kind, 'attribute_selector');
    assert.equal(r.testAttribute, 'data-test');
    assert.equal(r.value, 'store-card');
  });

  it('handles attribute selector with spaces and no quotes', () => {
    const r = parseFailingLocator(`locator('[ data-test = "store-card" ]')`);
    assert.ok(r);
    assert.equal(r.kind, 'attribute_selector');
    assert.equal(r.value, 'store-card');
  });

  it('returns null for pure assertion failure', () => {
    assert.equal(parseFailingLocator('Error: expected true to be false'), null);
  });

  it('returns null for a TypeError that has no locator shape', () => {
    const msg = `TypeError: Cannot read properties of undefined (reading 'value')
  at ProductsPage.expectCardShowsPrice (src/pages/ProductsPage.ts:42:14)`;
    assert.equal(parseFailingLocator(msg), null);
  });

  it('parses CSS id selector via locator()', () => {
    const r = parseFailingLocator("waiting for locator('#submit-btn')");
    assert.ok(r);
    assert.equal(r.kind, 'css_selector');
    assert.equal(r.cssSelector, '#submit-btn');
  });

  it('parses a nested CSS selector', () => {
    const r = parseFailingLocator("waiting for locator('.nav .item.active')");
    assert.ok(r);
    assert.equal(r.kind, 'css_selector');
    assert.equal(r.value, '.nav .item.active');
  });
});

describe('parseLocatorExpression', () => {
  it('treats a bare selector string as parseable', () => {
    const r = parseLocatorExpression(`[data-test="product-list"]`);
    assert.ok(r);
    assert.equal(r.kind, 'attribute_selector');
    assert.equal(r.value, 'product-list');
  });

  it('handles getByTestId() expression directly', () => {
    const r = parseLocatorExpression(`getByTestId('checkout-btn')`);
    assert.ok(r);
    assert.equal(r.kind, 'getByTestId');
    assert.equal(r.value, 'checkout-btn');
  });

  it('returns null for empty input', () => {
    assert.equal(parseLocatorExpression(''), null);
    assert.equal(parseLocatorExpression('   '), null);
  });
});

describe('parser fixture coverage (P0.2)', () => {
  it('parses ≥95% of the 50-failure fixture sample correctly', () => {
    let correct = 0;
    let total = 0;
    const failures: string[] = [];

    for (const f of ERROR_FIXTURES) {
      total++;
      const parsed = parseFailingLocator(f.errorMessage);

      if (f.expectedKind === null) {
        if (parsed === null) {
          correct++;
        } else {
          failures.push(`${f.id}: expected null, got ${parsed.kind}=${parsed.value}`);
        }
        continue;
      }

      if (!parsed) {
        failures.push(`${f.id}: expected ${f.expectedKind}, got null`);
        continue;
      }
      if (parsed.kind !== f.expectedKind) {
        failures.push(`${f.id}: expected kind ${f.expectedKind}, got ${parsed.kind}`);
        continue;
      }
      if (f.expectedValue !== undefined && parsed.value !== f.expectedValue) {
        failures.push(`${f.id}: expected value "${f.expectedValue}", got "${parsed.value}"`);
        continue;
      }
      correct++;
    }

    const accuracy = correct / total;
    console.log(`[parser-coverage] ${correct}/${total} (${(accuracy * 100).toFixed(1)}%)`);
    if (failures.length > 0) {
      console.log('[parser-coverage] failures:');
      for (const f of failures.slice(0, 20)) console.log(`  - ${f}`);
    }
    assert.ok(
      accuracy >= 0.95,
      `Parser accuracy ${(accuracy * 100).toFixed(1)}% < 95% required (${failures.length} failures)`,
    );
  });
});

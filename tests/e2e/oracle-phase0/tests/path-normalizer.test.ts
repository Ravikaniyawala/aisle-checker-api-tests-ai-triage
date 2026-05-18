import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from '../src/path-normalizer.ts';

const REPO = '/Users/me/aisle-checker';

describe('normalizePath', () => {
  it('relativizes absolute paths under repo root', () => {
    const r = normalizePath('/Users/me/aisle-checker/tests/e2e/src/pages/ProductsPage.ts', REPO);
    assert.equal(r.normalized, 'tests/e2e/src/pages/ProductsPage.ts');
    assert.equal(r.isRepoLocal, true);
  });

  it('strips file:// prefix', () => {
    const r = normalizePath('file:///Users/me/aisle-checker/foo.ts', REPO);
    assert.equal(r.normalized, 'foo.ts');
    assert.equal(r.isRepoLocal, true);
  });

  it('strips line:col suffix', () => {
    const r = normalizePath('/Users/me/aisle-checker/foo.ts:42:13', REPO);
    assert.equal(r.normalized, 'foo.ts');
  });

  it('handles paren-wrapped stack-style paths', () => {
    const r = normalizePath('(/Users/me/aisle-checker/foo.ts:42:13)', REPO);
    assert.equal(r.normalized, 'foo.ts');
  });

  it('flags node_modules as vendor', () => {
    const r = normalizePath('/Users/me/aisle-checker/node_modules/playwright/lib/foo.js', REPO);
    assert.equal(r.isVendor, true);
    assert.equal(r.isRepoLocal, true);  // technically under repo root
  });

  it('flags webpack:// prefix as bundled', () => {
    const r = normalizePath('webpack:///./src/Button.tsx', REPO);
    assert.equal(r.isBundled, true);
  });

  it('flags hashed asset names as bundled', () => {
    const r = normalizePath('/assets/index-abc123def.js', REPO);
    assert.equal(r.isBundled, true);
  });

  it('flags transient build dirs', () => {
    const r = normalizePath('/Users/me/aisle-checker/.next/cache/foo.json', REPO);
    assert.equal(r.isTransient, true);
  });

  it('handles arbitrary relative paths', () => {
    const r = normalizePath('./src/App.tsx', REPO);
    assert.equal(r.normalized, 'src/App.tsx');
    assert.equal(r.isRepoLocal, true);
  });

  it('handles bare paths above repo gracefully', () => {
    const r = normalizePath('/some/other/path/foo.ts', REPO);
    assert.equal(r.isRepoLocal, false);
  });

  it('handles empty input safely', () => {
    const r = normalizePath('', REPO);
    assert.equal(r.normalized, '');
    assert.equal(r.isRepoLocal, false);
  });
});

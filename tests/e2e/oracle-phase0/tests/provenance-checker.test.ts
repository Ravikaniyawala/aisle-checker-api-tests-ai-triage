import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyFrameProvenance, buildNormalizedFrame } from '../src/provenance-checker.ts';

const REPO = '/Users/me/aisle-checker';

describe('classifyFrameProvenance', () => {
  it('trusts repo-local .ts files', () => {
    const v = classifyFrameProvenance({
      rawFrame: `${REPO}/tests/e2e/src/pages/ProductsPage.ts`,
      repoRoot: REPO,
    });
    assert.equal(v.provenance, 'trusted');
  });

  it('untrusts node_modules', () => {
    const v = classifyFrameProvenance({
      rawFrame: `${REPO}/node_modules/playwright/lib/foo.js`,
      repoRoot: REPO,
    });
    assert.equal(v.provenance, 'untrusted');
    assert.match(v.reason, /vendor/);
  });

  it('untrusts bundled without source map', () => {
    const v = classifyFrameProvenance({
      rawFrame: '/assets/index-abc123def.js',
      repoRoot: REPO,
    });
    assert.equal(v.provenance, 'untrusted');
    assert.match(v.reason, /source-map/);
  });

  it('trusts bundled WITH source map', () => {
    const v = classifyFrameProvenance({
      rawFrame: '/assets/index-abc123def.js',
      repoRoot: REPO,
      hasSourceMap: true,
    });
    assert.equal(v.provenance, 'trusted');
  });

  it('untrusts transient build dirs', () => {
    const v = classifyFrameProvenance({
      rawFrame: `${REPO}/.next/cache/foo.json`,
      repoRoot: REPO,
    });
    assert.equal(v.provenance, 'untrusted');
    assert.match(v.reason, /transient/);
  });

  it('honors explicit trustedPrefixes', () => {
    const v = classifyFrameProvenance({
      rawFrame: `${REPO}/dist/main.js`,
      repoRoot: REPO,
      trustedPrefixes: ['dist/'],
    });
    assert.equal(v.provenance, 'trusted');
    assert.match(v.reason, /trusted prefix/);
  });
});

describe('buildNormalizedFrame', () => {
  it('captures line and column from "at fn (file:L:C)" form', () => {
    const f = buildNormalizedFrame(
      `at ProductsPage.click (${REPO}/tests/e2e/src/pages/ProductsPage.ts:42:13)`,
      REPO,
    );
    assert.equal(f.normalized, 'tests/e2e/src/pages/ProductsPage.ts');
    assert.equal(f.line, 42);
    assert.equal(f.column, 13);
    assert.equal(f.provenance, 'trusted');
  });

  it('handles bare file:line:col without "at"', () => {
    const f = buildNormalizedFrame(
      `${REPO}/foo.ts:99:1`,
      REPO,
    );
    assert.equal(f.normalized, 'foo.ts');
    assert.equal(f.line, 99);
    assert.equal(f.column, 1);
  });

  it('marks node_modules frames as untrusted', () => {
    const f = buildNormalizedFrame(
      `at run (${REPO}/node_modules/playwright/lib/foo.js:1:1)`,
      REPO,
    );
    assert.equal(f.provenance, 'untrusted');
  });
});

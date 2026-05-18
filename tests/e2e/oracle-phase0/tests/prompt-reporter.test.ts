import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify, collectErrorMessage, deriveTrustLevel, renderPromptMd,
} from '../reporter/prompt-reporter.ts';
import type { FailurePromptArtifact, NormalizedStackFrame } from '../src/types.ts';

describe('slugify', () => {
  it('replaces non-alphanumeric with dashes', () => {
    assert.equal(slugify('Products page > PROD-001: loads'), 'products-page-prod-001-loads');
  });
  it('collapses runs of separators', () => {
    assert.equal(slugify('a   b___c'), 'a-b-c');
  });
});

describe('collectErrorMessage', () => {
  it('uses both message and stack when distinct', () => {
    const r = collectErrorMessage({
      message: 'Timeout', stack: 'Error: Timeout\n  at foo',
    } as any);
    assert.match(r, /Timeout/);
    assert.match(r, /at foo/);
  });
  it('handles missing fields', () => {
    assert.equal(collectErrorMessage({} as any), '');
  });
});

describe('deriveTrustLevel', () => {
  function frame(provenance: 'trusted' | 'untrusted', normalized = 'tests/foo.ts'): NormalizedStackFrame {
    return { raw: '', file: '', normalized, provenance, reason: '' };
  }

  it('untrusted when no frames', () => {
    assert.equal(deriveTrustLevel([]), 'untrusted');
  });

  it('trusted when all user frames are trusted', () => {
    assert.equal(deriveTrustLevel([frame('trusted'), frame('trusted')]), 'trusted');
  });

  it('untrusted when all user frames untrusted', () => {
    assert.equal(deriveTrustLevel([frame('untrusted')]), 'untrusted');
  });

  it('partial when mixed', () => {
    assert.equal(deriveTrustLevel([frame('trusted'), frame('untrusted')]), 'partial');
  });

  it('ignores node_modules frames when deriving level', () => {
    const frames = [
      frame('trusted', 'tests/foo.ts'),
      frame('untrusted', 'node_modules/playwright/foo.js'),
    ];
    assert.equal(deriveTrustLevel(frames), 'trusted');
  });
});

describe('renderPromptMd', () => {
  const baseArtifact: FailurePromptArtifact = {
    testFile:           'tests/e2e/tests/products/products.spec.ts',
    testTitle:          'PROD-001: loads',
    errorMessage:       `TimeoutError: locator.click: Timeout 5000ms exceeded.\n  - waiting for getByTestId('product-list')`,
    framesNormalized:   [{
      raw:        '',
      file:       'tests/e2e/tests/products/products.spec.ts',
      normalized: 'tests/e2e/tests/products/products.spec.ts',
      line:       15,
      provenance: 'trusted',
      reason:     'repo-local source',
    }],
    artifactTrustLevel: 'trusted',
  };

  it('includes the canonical Playwright-prompt sections', () => {
    const md = renderPromptMd(baseArtifact);
    assert.match(md, /^# Test failure prompt/m);
    assert.match(md, /respect Playwright best practices/);
    assert.match(md, /## Error/);
    assert.match(md, /## Stack frames/);
    assert.match(md, /TimeoutError/);
    assert.match(md, /tests\/e2e\/tests\/products\/products\.spec\.ts/);
  });

  it('renders failing locator block when present', () => {
    const md = renderPromptMd({
      ...baseArtifact,
      failingLocator: {
        raw: "getByTestId('product-list')",
        kind: 'getByTestId',
        value: 'product-list',
        confidence: 0.95,
      },
    });
    assert.match(md, /## Failing locator/);
    assert.match(md, /kind: getByTestId/);
    assert.match(md, /value: product-list/);
  });

  it('renders ARIA snapshot block when present', () => {
    const md = renderPromptMd({
      ...baseArtifact,
      ariaSnapshot: '- list: "Products"\n  - listitem: "Milk"',
    });
    assert.match(md, /## ARIA snapshot at failure/);
    assert.match(md, /"Products"/);
  });

  it('annotates artifact trust level at the bottom', () => {
    const md = renderPromptMd(baseArtifact);
    assert.match(md, /Artifact trust level: `trusted`/);
  });
});

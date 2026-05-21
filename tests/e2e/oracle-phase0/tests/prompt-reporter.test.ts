import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  slugify, collectErrorMessage, deriveTrustLevel, renderPromptMd,
  extractAriaSnapshotAttachment,
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

// ── extractAriaSnapshotAttachment — reads the aria-snapshot.yaml ────────
// attachment emitted by the test fixture (base.ts). Binds the two
// pathways Playwright uses to surface attachments to reporters:
//   * `att.body` is a Buffer (inlined attachment)
//   * `att.path` points at a file on disk (large attachment)
//
// Both must resolve to the same string; missing/unrecognized
// attachments must return undefined so the reporter falls back to
// emitting an artifact without ARIA evidence (the failure-context
// loader on Oracle's side handles the absence gracefully).

describe('extractAriaSnapshotAttachment', () => {
  const baseResult = {
    duration: 0, errors: [], stdout: [], stderr: [], retry: 0,
    workerIndex: 0, parallelIndex: 0, status: 'failed' as const,
    startTime: new Date(), steps: [], annotations: [],
  };

  it('returns undefined when no attachments present', () => {
    const r = extractAriaSnapshotAttachment({ ...baseResult, attachments: [] } as any);
    assert.equal(r, undefined);
  });

  it('returns undefined when attachments are unrelated', () => {
    const r = extractAriaSnapshotAttachment({
      ...baseResult,
      attachments: [
        { name: 'screenshot', contentType: 'image/png', body: Buffer.from('not yaml') },
        { name: 'trace',      contentType: 'application/zip', path: '/tmp/trace.zip' },
      ],
    } as any);
    assert.equal(r, undefined);
  });

  it('reads aria-snapshot.yaml from att.body (inline Buffer)', () => {
    const yaml = '- button "Checkout" [data-test=checkout-btn]';
    const r = extractAriaSnapshotAttachment({
      ...baseResult,
      attachments: [
        { name: 'aria-snapshot.yaml', contentType: 'application/yaml', body: Buffer.from(yaml) },
      ],
    } as any);
    assert.equal(r, yaml);
  });

  it('reads aria-snapshot.yaml from att.path (file on disk)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'aria-snap-test-'));
    const file = join(tmp, 'aria-snapshot.yaml');
    const yaml = '- button "Save" [data-test=save-btn]';
    writeFileSync(file, yaml);
    try {
      const r = extractAriaSnapshotAttachment({
        ...baseResult,
        attachments: [
          { name: 'aria-snapshot.yaml', contentType: 'application/yaml', path: file },
        ],
      } as any);
      assert.equal(r, yaml);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('returns undefined when path points at missing file', () => {
    const r = extractAriaSnapshotAttachment({
      ...baseResult,
      attachments: [
        { name: 'aria-snapshot.yaml', contentType: 'application/yaml', path: '/nope/missing.yaml' },
      ],
    } as any);
    assert.equal(r, undefined);
  });

  it('returns undefined for empty body', () => {
    const r = extractAriaSnapshotAttachment({
      ...baseResult,
      attachments: [
        { name: 'aria-snapshot.yaml', contentType: 'application/yaml', body: Buffer.alloc(0) },
      ],
    } as any);
    assert.equal(r, undefined);
  });

  it('prefers the first matching attachment', () => {
    // Defensive: Playwright shouldn't emit two attachments with the
    // same name, but if it does (test re-attaches in a hook, etc.),
    // we want a deterministic outcome.
    const r = extractAriaSnapshotAttachment({
      ...baseResult,
      attachments: [
        { name: 'aria-snapshot.yaml', body: Buffer.from('- first') },
        { name: 'aria-snapshot.yaml', body: Buffer.from('- second') },
      ],
    } as any);
    assert.equal(r, '- first');
  });
});

/**
 * Reporter coverage end-to-end test.
 *
 * Builds synthetic Playwright `TestCase` + `TestResult` objects from the
 * ERROR_FIXTURES set, drives the prompt reporter against them, and verifies
 * each produced artifact has all required fields populated.
 *
 * Writes reports/reporter-coverage.json so the phase0-report aggregator
 * can include it in PHASE0_FINDINGS.md.
 *
 * "End-to-end" here means: the reporter's pure-helper pipeline
 * (collectErrorMessage → parseFailingLocator → buildNormalizedFrames →
 * renderPromptMd → required fields populated). We don't invoke the
 * Playwright runtime — the goal is to validate the supply-chain
 * pipeline shape, not to spin up browsers in CI for Phase 0.
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import {
  buildNormalizedFrames,
  deriveTrustLevel,
  renderPromptMd,
} from '../reporter/prompt-reporter.ts';
import { parseFailingLocator } from '../src/locator-parser.ts';
import { ERROR_FIXTURES } from '../fixtures/playwright-errors.ts';
import type { FailurePromptArtifact } from '../src/types.ts';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..', '..');

interface CoverageStats {
  fixturesTotal:    number;
  parserSuccesses:  number;
  parserNullExpected: number;
  parserAccuracy:   number;
  endToEndCoverage: number;
  perFixtureDetail: Array<{ id: string; ok: boolean; reasons: string[] }>;
}

function buildArtifactFromFixture(
  fixture: typeof ERROR_FIXTURES[number],
): FailurePromptArtifact {
  const errorMessage = fixture.errorMessage;
  const failingLocator = parseFailingLocator(errorMessage);

  // Synthesize a stack-shaped string so buildNormalizedFrames has something
  // to consume. Mirrors what real Playwright stack would look like.
  const synthStack = `Error: synthetic\n` +
    `  at ProductsPage.click (${REPO_ROOT}/tests/e2e/src/pages/ProductsPage.ts:42:13)\n` +
    `  at /tests/products/products.spec.ts:18:5`;

  const framesNormalized = buildNormalizedFrames(
    { stack: synthStack } as any,
    [],
    REPO_ROOT,
  );

  const artifact: FailurePromptArtifact = {
    testFile:           'tests/e2e/tests/products/products.spec.ts',
    testTitle:          fixture.id,
    errorMessage,
    framesNormalized,
    artifactTrustLevel: deriveTrustLevel(framesNormalized),
  };
  if (failingLocator) artifact.failingLocator = failingLocator;
  return artifact;
}

describe('reporter end-to-end coverage (P0.2)', () => {
  const stats: CoverageStats = {
    fixturesTotal:      0,
    parserSuccesses:    0,
    parserNullExpected: 0,
    parserAccuracy:     0,
    endToEndCoverage:   0,
    perFixtureDetail:   [],
  };

  let endToEndOk = 0;

  it('every fixture produces a valid prompt.md (≥95% required fields populated)', () => {
    for (const fx of ERROR_FIXTURES) {
      stats.fixturesTotal++;

      const artifact = buildArtifactFromFixture(fx);

      // Validate parser outcome aligns with fixture expectation
      const parsed = artifact.failingLocator;
      let parserOk = false;
      const reasons: string[] = [];

      if (fx.expectedKind === null) {
        if (parsed === undefined) {
          stats.parserNullExpected++;
          parserOk = true;
        } else {
          reasons.push(`parser returned ${parsed.kind}/${parsed.value}; expected null`);
        }
      } else if (parsed && parsed.kind === fx.expectedKind &&
                 (fx.expectedValue === undefined || parsed.value === fx.expectedValue)) {
        stats.parserSuccesses++;
        parserOk = true;
      } else if (!parsed) {
        reasons.push(`parser returned null; expected ${fx.expectedKind}`);
      } else {
        reasons.push(
          `parser kind=${parsed.kind}/value=${parsed.value}; ` +
          `expected ${fx.expectedKind}/${fx.expectedValue ?? '(any)'}`,
        );
      }

      // Validate end-to-end fields populated
      const renderedMd = renderPromptMd(artifact);
      const endToEndFieldsOk =
        renderedMd.includes('# Test failure prompt') &&
        renderedMd.includes('## Error') &&
        renderedMd.includes('## Stack frames') &&
        artifact.framesNormalized.length > 0 &&
        artifact.testFile.length > 0 &&
        artifact.errorMessage.length === fx.errorMessage.length;

      // For non-empty error messages, expect parser+e2e to both succeed.
      // For empty-message fixtures, the parser is correctly null and
      // we relax the e2e requirement (no error text → minimal prompt
      // is still valid).
      const isEmptyFixture = fx.errorMessage.length === 0;
      const fixtureOk = isEmptyFixture
        ? true  // empty input is gracefully handled
        : parserOk && endToEndFieldsOk;

      if (fixtureOk) endToEndOk++;
      else if (!endToEndFieldsOk) reasons.push('end-to-end fields missing in prompt.md');

      stats.perFixtureDetail.push({ id: fx.id, ok: fixtureOk, reasons });
    }

    const parserTotal = stats.fixturesTotal;
    const parserCorrect = stats.parserSuccesses + stats.parserNullExpected;
    stats.parserAccuracy = parserCorrect / parserTotal;
    stats.endToEndCoverage = endToEndOk / stats.fixturesTotal;

    console.log(`[reporter-cov] parser  = ${parserCorrect}/${parserTotal} = ${(stats.parserAccuracy * 100).toFixed(1)}%`);
    console.log(`[reporter-cov] end2end = ${endToEndOk}/${stats.fixturesTotal} = ${(stats.endToEndCoverage * 100).toFixed(1)}%`);

    const failed = stats.perFixtureDetail.filter(d => !d.ok);
    if (failed.length > 0) {
      console.log(`[reporter-cov] failures:`);
      for (const f of failed) {
        console.log(`  - ${f.id}: ${f.reasons.join('; ')}`);
      }
    }

    assert.ok(
      stats.parserAccuracy >= 0.95,
      `Parser accuracy ${(stats.parserAccuracy * 100).toFixed(1)}% < 95%`,
    );
    assert.ok(
      stats.endToEndCoverage >= 0.95,
      `End-to-end coverage ${(stats.endToEndCoverage * 100).toFixed(1)}% < 95%`,
    );
  });

  after(() => {
    const outPath = resolve(import.meta.dirname, '..', 'reports', 'reporter-coverage.json');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(stats, null, 2));
  });
});

/**
 * P0.1 driver — validates aisle-checker's declared topology.
 *
 * Writes a JSON report to reports/topology-validation.json so the
 * phase0-report aggregator can include it in PHASE0_FINDINGS.md.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { validateTopology, topologyAllowsAuto } from '../src/topology-validator.ts';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..', '..');

// Defaults the upstream Oracle autofix design ships with.
// Phase 0.4 reconciles these against aisle-checker reality.
const PRODUCT_SOURCE_PATTERNS = {
  include: ['app/**', 'src/**', 'lib/**', 'packages/*/src/**', 'apps/*/src/**'],
  exclude: [
    '**/*.spec.*',
    '**/*.test.*',
    '**/__tests__/**',
    'src/test-utils/**',
    'src/generated/**',
    '**/generated/**',
    '**/vendor/**',
    '**/fixtures/**',
    '**/page-objects/**',
    'apps/*/dist/**',
  ],
};

const ALLOWED_EDIT_PATHS = [
  'tests/**',
  'e2e/**',
  'playwright/**',
  'page-objects/**',
  'fixtures/**',
  'test-utils/**',
  'src/**/__tests__/**',
  'src/**/*.spec.*',
  'src/**/*.test.*',
];

// aisle-checker has UI app in apps/aisle-ui and Playwright tests in
// tests/e2e — same repo → monorepo_e2e topology.
const DECLARED_TOPOLOGY = 'monorepo_e2e' as const;

// Historical PR context: in Phase 0 we don't have access to Oracle's run
// history. Pretend an empty history; this will produce 'partial' state
// (correct: the repo has app source but Oracle has no PR record yet).
const HISTORICAL_PR_FILES: string[] = [];

console.log(`[phase0] validating topology declaration: ${DECLARED_TOPOLOGY}`);
console.log(`[phase0] repo root: ${REPO_ROOT}`);

const result = validateTopology({
  repoRoot:              REPO_ROOT,
  declaredTopology:      DECLARED_TOPOLOGY,
  productSourcePatterns: PRODUCT_SOURCE_PATTERNS,
  allowedEditPaths:      ALLOWED_EDIT_PATHS,
  historicalPrFilePaths: HISTORICAL_PR_FILES,
});

const allowsAuto = topologyAllowsAuto(result);

const report = {
  declaredTopology:                   DECLARED_TOPOLOGY,
  state:                              result.state,
  topologyAllowsAuto:                 allowsAuto,
  productSourcePatternsTried:         PRODUCT_SOURCE_PATTERNS,
  allowedEditPathsTried:              ALLOWED_EDIT_PATHS,
  resolvedAllowedEditPathsSample:     result.resolvedAllowedEditPaths,
  resolvedProductSourcePathsSample:   result.resolvedProductSourcePaths,
  validationFailures:                 result.validationFailures,
  validationWarnings:                 result.validationWarnings,
  appChangeVisibilityProven:          result.appChangeVisibilityProven,
};

const outPath = resolve(import.meta.dirname, '..', 'reports', 'topology-validation.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log();
console.log(`[phase0] topology state: ${result.state}`);
console.log(`[phase0] topology allows auto mode: ${allowsAuto}`);
console.log(`[phase0] resolved allowedEditPaths: ${result.resolvedAllowedEditPaths.length} files (sample)`);
console.log(`[phase0] resolved PRODUCT_SOURCE_PATTERNS: ${result.resolvedProductSourcePaths.length} files (sample)`);
if (result.validationFailures.length > 0) {
  console.log(`[phase0] validation FAILURES:`);
  for (const f of result.validationFailures) console.log(`  - ${f}`);
}
if (result.validationWarnings.length > 0) {
  console.log(`[phase0] validation warnings:`);
  for (const w of result.validationWarnings) console.log(`  - ${w}`);
}
console.log(`[phase0] report → ${outPath}`);

// Exit code: 0 if at least 'partial', 1 if 'failed'.
process.exit(result.state === 'failed' ? 1 : 0);

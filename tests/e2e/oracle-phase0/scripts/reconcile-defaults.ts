/**
 * P0.4 driver — reconcile the upstream Oracle autofix defaults against
 * aisle-checker's actual repo conventions. Surfaces:
 *   - Which proposed PRODUCT_SOURCE_PATTERNS resolve to real files
 *   - Which allowedEditPaths resolve to real files
 *   - Defaults that should be added/removed/adjusted for aisle-checker
 *
 * The output is a recommendations doc Phase 1 can read when picking
 * per-repo overrides.
 */

import { mkdirSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import picomatch from 'picomatch';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..', '..');

const PROPOSED_PRODUCT_SOURCE_PATTERNS = {
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

const PROPOSED_ALLOWED_EDIT_PATHS = [
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

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.idea', '.vscode',
  'dist', 'build', 'out', 'target', '.next',
  '.turbo', '.vite', '.parcel-cache', '.nyc_output', 'coverage',
]);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

function walk(root: string, max: number): string[] {
  const out: string[] = [];
  function w(dir: string): void {
    if (out.length >= max) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= max) return;
      if (SKIP_DIRS.has(e.name)) continue;
      if (SKIP_FILES.has(e.name)) continue;
      const f = join(dir, e.name);
      if (e.isDirectory()) w(f);
      else if (e.isFile()) out.push(relative(root, f));
    }
  }
  w(root);
  return out;
}

const files = walk(REPO_ROOT, 50_000);
console.log(`[phase0] scanned ${files.length} files under ${REPO_ROOT}`);

function matched(file: string, patterns: string[]): boolean {
  return patterns.some(p => picomatch(p, { dot: true })(file));
}

// Per-pattern: how many files matched?
const productInclude: Record<string, number> = {};
for (const p of PROPOSED_PRODUCT_SOURCE_PATTERNS.include) {
  productInclude[p] = files.filter(f => picomatch(p)(f)).length;
}
const productExclude: Record<string, number> = {};
for (const p of PROPOSED_PRODUCT_SOURCE_PATTERNS.exclude) {
  productExclude[p] = files.filter(f => picomatch(p, { dot: true })(f)).length;
}
const allowedEdit: Record<string, number> = {};
for (const p of PROPOSED_ALLOWED_EDIT_PATHS) {
  allowedEdit[p] = files.filter(f => picomatch(p, { dot: true })(f)).length;
}

// What does the union resolve to?
const productMatched = files.filter(
  f => matched(f, PROPOSED_PRODUCT_SOURCE_PATTERNS.include) &&
       !matched(f, PROPOSED_PRODUCT_SOURCE_PATTERNS.exclude),
);
const allowedMatched = files.filter(f => matched(f, PROPOSED_ALLOWED_EDIT_PATHS));

// What does aisle-checker have that the defaults MISSED?
// (look for product code patterns not covered)
const productLike = files.filter(f =>
  (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') ||
   f.endsWith('.js') || f.endsWith('.java')) &&
  !f.includes('node_modules/') &&
  !f.endsWith('.spec.ts') && !f.endsWith('.test.ts') &&
  !f.endsWith('.spec.js') && !f.endsWith('.test.js') &&
  !f.endsWith('.config.ts') && !f.endsWith('.config.js') &&
  !productMatched.includes(f) &&
  !allowedMatched.includes(f),
);

// Test-like files not covered by allowedEditPaths?
const testLike = files.filter(f =>
  (f.includes('/tests/') || f.includes('/test/') ||
   f.includes('/__tests__/') || /\.(spec|test)\.(ts|tsx|js|jsx)$/.test(f)) &&
  !f.includes('node_modules/') &&
  !f.includes('/target/') &&
  !allowedMatched.includes(f),
);

const recommendations: string[] = [];

if (productMatched.length === 0) {
  recommendations.push(
    'PRODUCT_SOURCE_PATTERNS resolves to 0 files — patterns do not match repo layout',
  );
} else {
  recommendations.push(
    `PRODUCT_SOURCE_PATTERNS resolves to ${productMatched.length} files`,
  );
}

if (allowedMatched.length === 0) {
  recommendations.push(
    'allowedEditPaths resolves to 0 files — patterns do not match repo layout',
  );
} else {
  recommendations.push(
    `allowedEditPaths resolves to ${allowedMatched.length} files`,
  );
}

// Aisle-checker specifics
if (files.some(f => f.startsWith('apps/aisle-api/'))) {
  recommendations.push(
    'aisle-checker uses apps/aisle-api/ for Java API — defaults include apps/*/src/** which covers Java sources too',
  );
}
if (files.some(f => f.startsWith('apps/aisle-ui/src/'))) {
  recommendations.push(
    'aisle-checker UI lives at apps/aisle-ui/src/** — covered by apps/*/src/** include',
  );
}
if (files.some(f => f.startsWith('tests/api/'))) {
  recommendations.push(
    'aisle-checker has Java API tests at tests/api/ — already covered by tests/** allowedEditPaths',
  );
}
if (files.some(f => f.startsWith('tests/e2e/src/pages/'))) {
  recommendations.push(
    'aisle-checker page objects live at tests/e2e/src/pages/ — covered by tests/** but NOT by page-objects/**; consider replacing page-objects/** with tests/**/pages/** OR keeping both',
  );
}
if (files.some(f => f.startsWith('tests/e2e/src/fixtures/'))) {
  recommendations.push(
    'aisle-checker fixtures live at tests/e2e/src/fixtures/ — covered by tests/** but NOT by fixtures/**; same note as page objects',
  );
}
if (productLike.length > 0) {
  recommendations.push(
    `${productLike.length} product-shaped files NOT covered by PRODUCT_SOURCE_PATTERNS — sample: ${productLike.slice(0, 5).join(', ')}`,
  );
}
if (testLike.length > 0) {
  recommendations.push(
    `${testLike.length} test-shaped files NOT covered by allowedEditPaths — sample: ${testLike.slice(0, 5).join(', ')}`,
  );
}

// Aisle-checker uses data-test (not data-testid). Recommend including in
// the test-attribute name list.
recommendations.push(
  'aisle-checker uses `testIdAttribute: data-test` in playwright.config.ts — ' +
  'ensure data-test is in DEFAULT_TEST_ATTRIBUTES for the locator-drift classifier ' +
  '(already present in Phase 0 defaults)',
);

const report = {
  filesScanned:              files.length,
  productSourcePatterns: {
    proposed:                PROPOSED_PRODUCT_SOURCE_PATTERNS,
    perIncludePatternMatches: productInclude,
    perExcludePatternMatches: productExclude,
    unionResolved:           productMatched.length,
    sample:                  productMatched.slice(0, 25),
  },
  allowedEditPaths: {
    proposed:                PROPOSED_ALLOWED_EDIT_PATHS,
    perPatternMatches:       allowedEdit,
    unionResolved:           allowedMatched.length,
    sample:                  allowedMatched.slice(0, 25),
  },
  productShapedNotCovered:   productLike.slice(0, 25),
  testShapedNotCovered:      testLike.slice(0, 25),
  recommendations,
};

const outPath = resolve(import.meta.dirname, '..', 'reports', 'defaults-reconciliation.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log();
console.log('=== Recommendations ===');
for (const r of recommendations) console.log(`  - ${r}`);
console.log();
console.log(`[phase0] report → ${outPath}`);

process.exit(0);

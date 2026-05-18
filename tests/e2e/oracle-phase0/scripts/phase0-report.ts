/**
 * Aggregates outputs from validate-topology / eval-classifier / reconcile-defaults
 * into PHASE0_FINDINGS.md. Computes PASS/FAIL per exit criterion.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const REPORTS_DIR = resolve(import.meta.dirname, '..', 'reports');
const OUT_PATH    = resolve(REPORTS_DIR, 'PHASE0_FINDINGS.md');

function load<T>(name: string): T | null {
  const p = resolve(REPORTS_DIR, name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')) as T;
}

interface TopologyReport {
  declaredTopology: string;
  state: 'full' | 'partial' | 'failed';
  topologyAllowsAuto: boolean;
  validationFailures: string[];
  validationWarnings: string[];
  resolvedAllowedEditPathsSample: string[];
  resolvedProductSourcePathsSample: string[];
  appChangeVisibilityProven: boolean;
}

interface ClassifierReport {
  handCrafted: {
    total: number;
    byKind: Record<string, { total: number; correct: number; accuracy: number }>;
    overall: { total: number; correct: number; accuracy: number };
    failures: Array<{ id: string; expected: string; actual: string | null; reasoning: string; rationale: string }>;
  };
  fullSet: {
    total: number;
    byKind: Record<string, { total: number; correct: number; accuracy: number }>;
    overall: { total: number; correct: number; accuracy: number };
  };
}

interface DefaultsReport {
  filesScanned: number;
  productSourcePatterns: { unionResolved: number };
  allowedEditPaths: { unionResolved: number };
  productShapedNotCovered: string[];
  testShapedNotCovered: string[];
  recommendations: string[];
}

interface ReporterCoverageReport {
  fixturesTotal:    number;
  parserSuccesses:  number;
  parserNullExpected: number;
  parserAccuracy:   number;
  /** Fraction of failure-context artifacts containing every required field. */
  endToEndCoverage: number;
}

const topology    = load<TopologyReport>('topology-validation.json');
const classifier  = load<ClassifierReport>('classifier-eval.json');
const defaults    = load<DefaultsReport>('defaults-reconciliation.json');
const reporterCov = load<ReporterCoverageReport>('reporter-coverage.json');

// ── Exit criterion checks ─────────────────────────────────────────────────

interface ExitCriterion {
  id:        string;
  label:     string;
  threshold: string;
  observed:  string;
  pass:      boolean;
  notes?:    string;
}

const exitCriteria: ExitCriterion[] = [];

// EC1: topology validation PASSES (≠ failed)
exitCriteria.push({
  id:        'EC1',
  label:     'Topology validation passes (state ≠ failed)',
  threshold: `state ∈ {full, partial}`,
  observed:  topology ? `state = ${topology.state}` : 'not run',
  pass:      !!topology && topology.state !== 'failed',
  notes:     topology?.state === 'partial'
    ? `partial is expected for first-time Phase 0 runs; will upgrade to full once historical PR context overlaps PRODUCT_SOURCE_PATTERNS`
    : undefined,
});

// EC2: artifact supply chain ≥95% on a 50-failure sample
exitCriteria.push({
  id:        'EC2',
  label:     'Artifact supply chain works on ≥95% of 50-failure sample',
  threshold: '≥95% parser accuracy AND end-to-end coverage',
  observed:  reporterCov
    ? `parser accuracy = ${(reporterCov.parserAccuracy * 100).toFixed(1)}%, end-to-end = ${(reporterCov.endToEndCoverage * 100).toFixed(1)}%`
    : 'not run',
  pass:      !!reporterCov && reporterCov.parserAccuracy >= 0.95 && reporterCov.endToEndCoverage >= 0.95,
});

// EC3: locator-drift classifier ≥85% per sub-kind
if (classifier) {
  const perKindResults = Object.entries(classifier.fullSet.byKind).map(([k, s]) => ({
    k, accuracy: s.accuracy,
  }));
  const minAccuracy = Math.min(...perKindResults.map(r => r.accuracy));
  const worstKind = perKindResults.reduce((a, b) => a.accuracy < b.accuracy ? a : b);
  exitCriteria.push({
    id:        'EC3',
    label:     'Locator-drift classifier ≥85% per sub-kind accuracy',
    threshold: 'every sub-kind ≥ 85%',
    observed:  `min per-kind = ${(minAccuracy * 100).toFixed(1)}% (${worstKind.k})`,
    pass:      minAccuracy >= 0.85,
  });
} else {
  exitCriteria.push({
    id: 'EC3', label: 'Locator-drift classifier ≥85% per sub-kind accuracy',
    threshold: 'every sub-kind ≥ 85%', observed: 'not run', pass: false,
  });
}

// EC4: defaults reconciled (PRODUCT_SOURCE_PATTERNS + allowedEditPaths resolve to ≥1 file each)
exitCriteria.push({
  id:        'EC4',
  label:     'Defaults reconciled — patterns resolve against aisle-checker layout',
  threshold: 'PRODUCT_SOURCE_PATTERNS and allowedEditPaths each match ≥ 1 file',
  observed:  defaults
    ? `product=${defaults.productSourcePatterns.unionResolved}, allowed=${defaults.allowedEditPaths.unionResolved}`
    : 'not run',
  pass:      !!defaults &&
             defaults.productSourcePatterns.unionResolved > 0 &&
             defaults.allowedEditPaths.unionResolved > 0,
});

const allPass = exitCriteria.every(ec => ec.pass);

// ── Markdown render ───────────────────────────────────────────────────────

const lines: string[] = [];
lines.push(`# Oracle Autofix — Phase 0 Findings`);
lines.push('');
lines.push(`**Verdict:** ${allPass ? 'PHASE 0 PASS — Phase 1 unblocked' : 'PHASE 0 INCOMPLETE — see exit criterion failures below'}`);
lines.push('');
lines.push(`Repo under test: \`aisle-checker-api-tests-ai-triage\``);
lines.push(`Declared topology: \`${topology?.declaredTopology ?? '(unknown)'}\``);
lines.push(`Topology state: \`${topology?.state ?? '(unknown)'}\``);
lines.push(`Topology allows auto: \`${topology?.topologyAllowsAuto ?? '(unknown)'}\``);
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');

lines.push(`## Exit criteria`);
lines.push('');
lines.push(`| ID | Criterion | Threshold | Observed | Verdict |`);
lines.push(`|---|---|---|---|---|`);
for (const ec of exitCriteria) {
  lines.push(`| ${ec.id} | ${ec.label} | ${ec.threshold} | ${ec.observed} | ${ec.pass ? '✅ PASS' : '❌ FAIL'} |`);
}
lines.push('');
for (const ec of exitCriteria) {
  if (ec.notes) lines.push(`> ${ec.id}: ${ec.notes}`);
}
lines.push('');

// ── P0.1 topology ─────────────────────────────────────────────────────────
lines.push(`## P0.1 — Topology validation`);
lines.push('');
if (topology) {
  lines.push(`- State: **${topology.state}**`);
  lines.push(`- App-change visibility proven: ${topology.appChangeVisibilityProven}`);
  lines.push(`- Resolved allowedEditPaths sample (${topology.resolvedAllowedEditPathsSample.length}):`);
  for (const p of topology.resolvedAllowedEditPathsSample.slice(0, 10)) lines.push(`  - \`${p}\``);
  lines.push(`- Resolved PRODUCT_SOURCE_PATTERNS sample (${topology.resolvedProductSourcePathsSample.length}):`);
  for (const p of topology.resolvedProductSourcePathsSample.slice(0, 10)) lines.push(`  - \`${p}\``);
  if (topology.validationFailures.length > 0) {
    lines.push(`- ❌ Validation failures:`);
    for (const f of topology.validationFailures) lines.push(`  - ${f}`);
  }
  if (topology.validationWarnings.length > 0) {
    lines.push(`- ⚠️ Warnings:`);
    for (const w of topology.validationWarnings) lines.push(`  - ${w}`);
  }
} else {
  lines.push(`Not run — execute \`npm run validate:topology\`.`);
}
lines.push('');

// ── P0.2 artifact supply chain ────────────────────────────────────────────
lines.push(`## P0.2 — Artifact supply chain`);
lines.push('');
if (reporterCov) {
  lines.push(`- Locator parser:`);
  lines.push(`  - Fixtures: ${reporterCov.fixturesTotal}`);
  lines.push(`  - Parsed correctly: ${reporterCov.parserSuccesses}`);
  lines.push(`  - Expected null (parser correctly returned null): ${reporterCov.parserNullExpected}`);
  lines.push(`  - Accuracy: ${(reporterCov.parserAccuracy * 100).toFixed(1)}%`);
  lines.push(`- End-to-end coverage (every required field populated): ${(reporterCov.endToEndCoverage * 100).toFixed(1)}%`);
} else {
  lines.push(`Not run — \`npm test\` will populate this.`);
}
lines.push('');

// ── P0.3 classifier ───────────────────────────────────────────────────────
lines.push(`## P0.3 — Locator-drift classifier accuracy`);
lines.push('');
if (classifier) {
  lines.push(`### Hand-crafted cases`);
  lines.push('');
  lines.push(`| Sub-kind | Correct / Total | Accuracy |`);
  lines.push(`|---|---|---|`);
  for (const [k, s] of Object.entries(classifier.handCrafted.byKind)) {
    lines.push(`| \`${k}\` | ${s.correct} / ${s.total} | ${(s.accuracy * 100).toFixed(1)}% |`);
  }
  lines.push(`| **OVERALL** | **${classifier.handCrafted.overall.correct} / ${classifier.handCrafted.overall.total}** | **${(classifier.handCrafted.overall.accuracy * 100).toFixed(1)}%** |`);
  lines.push('');
  lines.push(`### Hand-crafted + synthetic (full)`);
  lines.push('');
  lines.push(`| Sub-kind | Correct / Total | Accuracy |`);
  lines.push(`|---|---|---|`);
  for (const [k, s] of Object.entries(classifier.fullSet.byKind)) {
    lines.push(`| \`${k}\` | ${s.correct} / ${s.total} | ${(s.accuracy * 100).toFixed(1)}% |`);
  }
  lines.push(`| **OVERALL** | **${classifier.fullSet.overall.correct} / ${classifier.fullSet.overall.total}** | **${(classifier.fullSet.overall.accuracy * 100).toFixed(1)}%** |`);
  lines.push('');

  if (classifier.handCrafted.failures.length > 0) {
    lines.push(`### Hand-crafted failures (${classifier.handCrafted.failures.length})`);
    lines.push('');
    for (const f of classifier.handCrafted.failures.slice(0, 20)) {
      lines.push(`- \`${f.id}\`: expected \`${f.expected}\`, got \`${f.actual ?? 'null'}\` — ${f.reasoning}`);
    }
    lines.push('');
  }
} else {
  lines.push(`Not run — execute \`npm run eval:classifier\`.`);
}

// ── P0.4 defaults ─────────────────────────────────────────────────────────
lines.push(`## P0.4 — Defaults reconciliation`);
lines.push('');
if (defaults) {
  lines.push(`- Files scanned: ${defaults.filesScanned}`);
  lines.push(`- PRODUCT_SOURCE_PATTERNS resolves to: ${defaults.productSourcePatterns.unionResolved} files`);
  lines.push(`- allowedEditPaths resolves to: ${defaults.allowedEditPaths.unionResolved} files`);
  if (defaults.productShapedNotCovered.length > 0) {
    lines.push(`- Product-shaped files NOT covered (${defaults.productShapedNotCovered.length} sample):`);
    for (const p of defaults.productShapedNotCovered.slice(0, 10)) lines.push(`  - \`${p}\``);
  }
  if (defaults.testShapedNotCovered.length > 0) {
    lines.push(`- Test-shaped files NOT covered (${defaults.testShapedNotCovered.length} sample):`);
    for (const p of defaults.testShapedNotCovered.slice(0, 10)) lines.push(`  - \`${p}\``);
  }
  lines.push(`- Recommendations:`);
  for (const r of defaults.recommendations) lines.push(`  - ${r}`);
} else {
  lines.push(`Not run — execute \`npm run reconcile:defaults\`.`);
}
lines.push('');

// ── Conclusion ────────────────────────────────────────────────────────────
lines.push(`## Conclusion`);
lines.push('');
if (allPass) {
  lines.push(`All exit criteria met. Phase 1 implementation can proceed.`);
} else {
  lines.push(`Some exit criteria failed. Address the failing checks before Phase 1 begins.`);
}
lines.push('');
lines.push(`See the JSON reports alongside this file for full machine-readable detail.`);

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, lines.join('\n') + '\n');

console.log(`[phase0] wrote ${OUT_PATH}`);
console.log(`[phase0] verdict: ${allPass ? 'PASS' : 'INCOMPLETE'}`);

process.exit(allPass ? 0 : 1);

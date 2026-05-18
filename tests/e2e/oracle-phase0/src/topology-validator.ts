/**
 * Topology validator — verifies that a declared `ORACLE_TEST_REPO_TOPOLOGY`
 * matches reality before any autofix gating happens.
 *
 * Three states:
 *   - full:    structural checks pass AND historical PR context proves
 *              app-change visibility
 *   - partial: structural checks pass but no historical PR context yet
 *              (new repo); topologyAllowsAuto stays false until upgraded
 *   - failed:  structural checks fail (no allowed paths resolve, or
 *              monorepo declared but PRODUCT_SOURCE_PATTERNS resolves to 0
 *              files); operator config fix required
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import picomatch from 'picomatch';
import type { RepoTopology, TopologyValidationResult } from './types.ts';

export interface TopologyValidatorOptions {
  repoRoot:                string;
  declaredTopology:        RepoTopology;
  productSourcePatterns:   { include: string[]; exclude: string[] };
  allowedEditPaths:        string[];
  /** Historical PR context paths from prior Oracle runs (optional). Empty = no history. */
  historicalPrFilePaths?:  string[];
  /** Max files to scan per directory; defensive cap. */
  maxFilesScanned?:        number;
}

/**
 * Walk repoRoot collecting files, then test inclusion/exclusion masks.
 * Skips well-known noise dirs to keep the scan bounded.
 */
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.idea', '.vscode',
  'dist', 'build', 'out', 'target', '.next',
  '.turbo', '.vite', '.parcel-cache', '.nyc_output', 'coverage',
]);

const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

function walkRepoFiles(root: string, maxFiles: number): string[] {
  const out: string[] = [];

  function walk(dir: string): void {
    if (out.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= maxFiles) return;
      if (SKIP_DIRS.has(entry.name)) continue;
      if (SKIP_FILES.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        out.push(relative(root, full));
      }
    }
  }

  walk(root);
  return out;
}

function matchAny(file: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const matchers = patterns.map(p => picomatch(p, { dot: true }));
  return matchers.some(m => m(file));
}

export function validateTopology(opts: TopologyValidatorOptions): TopologyValidationResult {
  const maxFiles = opts.maxFilesScanned ?? 50_000;

  const validationFailures: string[] = [];
  const validationWarnings: string[] = [];

  // ── Structural prerequisites ────────────────────────────────────────────
  if (!existsSync(opts.repoRoot)) {
    return {
      declared:                     opts.declaredTopology,
      state:                        'failed',
      validationFailures:           [`repoRoot does not exist: ${opts.repoRoot}`],
      validationWarnings:           [],
      resolvedAllowedEditPaths:     [],
      resolvedProductSourcePaths:   [],
      appChangeVisibilityProven:    false,
    };
  }

  const stat = statSync(opts.repoRoot);
  if (!stat.isDirectory()) {
    return {
      declared:                     opts.declaredTopology,
      state:                        'failed',
      validationFailures:           [`repoRoot is not a directory: ${opts.repoRoot}`],
      validationWarnings:           [],
      resolvedAllowedEditPaths:     [],
      resolvedProductSourcePaths:   [],
      appChangeVisibilityProven:    false,
    };
  }

  const files = walkRepoFiles(opts.repoRoot, maxFiles);
  if (files.length >= maxFiles) {
    validationWarnings.push(
      `file scan hit cap of ${maxFiles}; validation may be incomplete`,
    );
  }

  // ── Resolve allowedEditPaths ────────────────────────────────────────────
  const allowedMatched = files.filter(f => matchAny(f, opts.allowedEditPaths));
  if (allowedMatched.length === 0) {
    validationFailures.push(
      `allowedEditPaths resolved to 0 files; check globs match repo layout. ` +
      `Patterns: ${opts.allowedEditPaths.join(', ')}`,
    );
  }

  // ── Resolve PRODUCT_SOURCE_PATTERNS (skipped for split_e2e) ─────────────
  let productMatched: string[] = [];
  if (opts.declaredTopology === 'split_e2e') {
    // Split-repo: app source is in a different repo; PRODUCT_SOURCE_PATTERNS
    // is expected to be empty or non-resolving here. Do not require matches.
    if (opts.productSourcePatterns.include.length > 0) {
      validationWarnings.push(
        'split_e2e topology with non-empty PRODUCT_SOURCE_PATTERNS; usually app ' +
        'source is in a separate repo. Empty include list is recommended.',
      );
    }
  } else {
    const included = files.filter(f => matchAny(f, opts.productSourcePatterns.include));
    productMatched = included.filter(
      f => !matchAny(f, opts.productSourcePatterns.exclude),
    );
    if (productMatched.length === 0) {
      validationFailures.push(
        `PRODUCT_SOURCE_PATTERNS resolved to 0 files after exclusions; either ` +
        `topology was misdeclared as ${opts.declaredTopology} or the patterns ` +
        `are wrong. Include: ${opts.productSourcePatterns.include.join(', ')} | ` +
        `Exclude: ${opts.productSourcePatterns.exclude.join(', ')}`,
      );
    }
  }

  // ── Structural verdict ──────────────────────────────────────────────────
  if (validationFailures.length > 0) {
    return {
      declared:                     opts.declaredTopology,
      state:                        'failed',
      validationFailures,
      validationWarnings,
      resolvedAllowedEditPaths:     allowedMatched.slice(0, 20),
      resolvedProductSourcePaths:   productMatched.slice(0, 20),
      appChangeVisibilityProven:    false,
    };
  }

  // ── App-change visibility (only meaningful for monorepo topologies) ─────
  let appChangeVisibilityProven = false;
  if (opts.declaredTopology === 'split_e2e') {
    // App changes are intrinsically invisible to a split test repo.
    // Mark "proven false" but it doesn't move us into partial — split_e2e
    // is always partial (no auto in Phase 1 regardless) per design.
    appChangeVisibilityProven = false;
  } else {
    const historical = opts.historicalPrFilePaths ?? [];
    appChangeVisibilityProven = historical.some(
      f => matchAny(f, opts.productSourcePatterns.include) &&
           !matchAny(f, opts.productSourcePatterns.exclude),
    );
  }

  // ── Final state ─────────────────────────────────────────────────────────
  let state: TopologyValidationResult['state'];
  if (opts.declaredTopology === 'split_e2e') {
    // split_e2e never reaches 'full' — auto is disallowed regardless.
    state = 'partial';
    validationWarnings.push(
      'topology_app_change_visibility_unproven: split_e2e cannot prove ' +
      'app-change visibility within this repo. Auto mode is disallowed in Phase 1; ' +
      'unblocked by Phase 4 cross-repo deploy correlation.',
    );
  } else if (appChangeVisibilityProven) {
    state = 'full';
  } else {
    state = 'partial';
    validationWarnings.push(
      'topology_app_change_visibility_unproven: no historical PR context ' +
      'overlapping with PRODUCT_SOURCE_PATTERNS yet. Will upgrade to full once ' +
      'a PR touches product source.',
    );
  }

  return {
    declared:                     opts.declaredTopology,
    state,
    validationFailures,
    validationWarnings,
    resolvedAllowedEditPaths:     allowedMatched.slice(0, 20),
    resolvedProductSourcePaths:   productMatched.slice(0, 20),
    appChangeVisibilityProven,
  };
}

/**
 * Derive `topologyAllowsAuto` from a validation result. In Phase 0 this is
 * the same rule the upstream Phase 1 detector will apply: only `full` state
 * for monorepo topologies permits auto. `partial`, `failed`, and any
 * `split_e2e` are auto-disabled.
 */
export function topologyAllowsAuto(result: TopologyValidationResult): boolean {
  if (result.state !== 'full') return false;
  if (result.declared === 'split_e2e') return false;  // belt + suspenders
  return true;
}

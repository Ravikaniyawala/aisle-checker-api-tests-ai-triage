/**
 * Provenance checker — classifies a normalized stack frame as `trusted` or
 * `untrusted` for source-attribution purposes.
 *
 * Trust rules (in priority order, first match wins):
 *   1. Bundled paths (hashed asset names, /assets/, etc.) → untrusted
 *      unless an explicit source-map mapping resolves them to a repo path.
 *   2. Vendor paths (node_modules, vendor/) → untrusted for source-positive
 *      use; cannot hard-pin app_code from vendor frames.
 *   3. Transient paths (.next/.cache/.turbo) → untrusted.
 *   4. Repo-local paths with no source-map ambiguity → trusted.
 *   5. Anything else → untrusted by default (low-trust default).
 *
 * Source-map presence is implemented as a boolean input rather than a
 * filesystem check, so the caller can decide how to detect them (CI may
 * not have source-map sidecars; dev runs often do).
 */

import type { NormalizedStackFrame, StackFrameProvenance } from './types.ts';
import { normalizePath } from './path-normalizer.ts';

export interface ProvenanceInput {
  rawFrame:           string;
  repoRoot:           string;
  /** Did we find a corresponding source-map sidecar for this path? */
  hasSourceMap?:      boolean;
  /** Override: known-trusted prefixes (e.g. for source-mapped dev runs). */
  trustedPrefixes?:   string[];
}

export interface ProvenanceVerdict {
  provenance: StackFrameProvenance;
  reason:     string;
}

/**
 * Classify a single raw stack frame string. Frame may be in any of the
 * shapes the path normalizer accepts.
 */
export function classifyFrameProvenance(input: ProvenanceInput): ProvenanceVerdict {
  const norm = normalizePath(input.rawFrame, input.repoRoot);

  // Rule 1: bundled paths.
  if (norm.isBundled) {
    if (input.hasSourceMap) {
      return {
        provenance: 'trusted',
        reason:     'bundled path with source-map sidecar',
      };
    }
    return {
      provenance: 'untrusted',
      reason:     'bundled path without source-map provenance',
    };
  }

  // Rule 2: vendor.
  if (norm.isVendor) {
    return {
      provenance: 'untrusted',
      reason:     'vendor path (node_modules / vendor)',
    };
  }

  // Rule 3: transient.
  if (norm.isTransient) {
    return {
      provenance: 'untrusted',
      reason:     'transient build/cache path',
    };
  }

  // Rule 4: explicit trusted prefix.
  if (input.trustedPrefixes?.some(p => norm.normalized.startsWith(p))) {
    return { provenance: 'trusted', reason: 'matches trusted prefix' };
  }

  // Rule 5: repo-local + has source map → trusted.
  if (norm.isRepoLocal) {
    if (input.hasSourceMap || norm.normalized.endsWith('.ts') ||
        norm.normalized.endsWith('.tsx') || norm.normalized.endsWith('.js') ||
        norm.normalized.endsWith('.jsx') || norm.normalized.endsWith('.mjs')) {
      return { provenance: 'trusted', reason: 'repo-local source file' };
    }
    return {
      provenance: 'untrusted',
      reason:     'repo-local but extension/source-map unclear',
    };
  }

  return {
    provenance: 'untrusted',
    reason:     'no trust signal (not repo-local, not source-mapped)',
  };
}

/**
 * Build a NormalizedStackFrame from a raw stack line. Convenience function
 * that combines path normalization + provenance classification + line/col
 * parsing.
 */
export function buildNormalizedFrame(
  rawLine:    string,
  repoRoot:   string,
  options?:   Pick<ProvenanceInput, 'hasSourceMap' | 'trustedPrefixes'>,
): NormalizedStackFrame {
  // Try to capture path + line + col from typical "at fn (file:L:C)" or
  // "at file:L:C" or "file:L:C" shapes.
  const positionMatch = rawLine.match(/(?:^|[\s(])([^\s()]+?):(\d+)(?::(\d+))?/);
  const filePath = positionMatch ? positionMatch[1]! : rawLine.trim();
  const line     = positionMatch?.[2] ? Number(positionMatch[2]) : undefined;
  const column   = positionMatch?.[3] ? Number(positionMatch[3]) : undefined;

  const verdict = classifyFrameProvenance({
    rawFrame:        filePath,
    repoRoot,
    hasSourceMap:    options?.hasSourceMap,
    trustedPrefixes: options?.trustedPrefixes,
  });

  const norm = normalizePath(filePath, repoRoot);

  const frame: NormalizedStackFrame = {
    raw:        rawLine,
    file:       filePath,
    normalized: norm.normalized,
    provenance: verdict.provenance,
    reason:     verdict.reason,
  };
  if (line !== undefined) frame.line = line;
  if (column !== undefined) frame.column = column;
  return frame;
}

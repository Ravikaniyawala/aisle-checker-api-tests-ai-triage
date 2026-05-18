/**
 * Path normalizer — converts whatever path shape Playwright surfaces in a
 * stack frame into a repo-relative path the rest of the detector can use.
 *
 * Real shapes encountered:
 *   - Absolute paths:        /Users/x/repo/tests/foo.spec.ts
 *   - file:// URLs:          file:///Users/x/repo/tests/foo.spec.ts
 *   - Webpack-mapped paths:  webpack:///./src/Button.tsx
 *   - Bundled JS:            /assets/index-abc123.js  (no source map)
 *   - node_modules:          /Users/x/repo/node_modules/playwright/lib/...
 *   - Source-mapped:         /repo/src/Button.tsx?sourceMap (Vite dev)
 */

import { isAbsolute, relative, sep, posix } from 'path';

export interface PathNormalizationResult {
  raw:        string;
  normalized: string;          // repo-relative when possible, else raw
  isRepoLocal: boolean;
  isBundled:   boolean;        // looks bundled (hashed name, /assets/, etc.)
  isVendor:    boolean;        // node_modules or known vendor dir
  isTransient: boolean;        // .next/.cache/.turbo/etc.
}

const BUNDLED_PATH_PATTERNS = [
  // Hashed asset names: index-abc123.js, app.1a2b3c4d.js
  /\/(?:assets|static|build|dist|out)\/[A-Za-z0-9_-]+[.-][a-f0-9]{6,}\.[a-z]+$/i,
  /[A-Za-z0-9_-]+\.[a-f0-9]{6,}\.[a-z]+$/i,
  // Webpack runtime / chunk paths
  /^webpack:\/\/\//,
  /webpack:\/\/[^\/]+\/\(webpack\)/,
];

const VENDOR_PATH_PATTERNS = [
  /(?:^|\/)node_modules\//,
  /(?:^|\/)vendor\//,
];

const TRANSIENT_PATH_PATTERNS = [
  /(?:^|\/)\.next\//,
  /(?:^|\/)\.turbo\//,
  /(?:^|\/)\.cache\//,
  /(?:^|\/)\.parcel-cache\//,
  /(?:^|\/)\.vite\//,
  /(?:^|\/)\.nyc_output\//,
];

/**
 * Strip file:// prefix, query strings, and webpack:// markers; convert to
 * platform path separators.
 */
function cleanPath(input: string): string {
  let s = input.trim();

  // Strip stack-frame parenthesization commonly emitted by Node: "(...:line:col)"
  // We only care about the path portion.
  const parenMatch = s.match(/\((.+?)(?::\d+)?(?::\d+)?\)$/);
  if (parenMatch) s = parenMatch[1]!;

  // Strip leading "at " from raw stack lines if present.
  s = s.replace(/^\s*at\s+(?:[\w.<>$]+\s*\()?/, '');
  s = s.replace(/\)$/, '');

  // file:// URL
  if (s.startsWith('file://')) s = s.slice('file://'.length);

  // webpack:/// → ./ relative
  if (s.startsWith('webpack:///')) s = s.slice('webpack:///'.length);

  // Strip query strings and hash fragments
  s = s.split('?')[0]!;
  s = s.split('#')[0]!;

  // Strip trailing :line:col
  s = s.replace(/:\d+:\d+$/, '');
  s = s.replace(/:\d+$/, '');

  return s;
}

/**
 * Normalize a raw path against a repo root. Best-effort:
 *   - absolute paths under repoRoot → repo-relative
 *   - webpack-style ./src/x → kept as-is (already relative-ish)
 *   - bundled/vendor/transient → flagged, normalized = the cleaned path
 *
 * Bundled / vendor / transient detection runs against BOTH the raw input
 * and the cleaned form, because cleanPath strips webpack:// prefixes that
 * are themselves a bundled-source indicator.
 */
export function normalizePath(rawInput: string, repoRoot: string): PathNormalizationResult {
  if (!rawInput) {
    return {
      raw:         rawInput,
      normalized:  '',
      isRepoLocal: false,
      isBundled:   false,
      isVendor:    false,
      isTransient: false,
    };
  }

  const cleaned = cleanPath(rawInput);

  const isBundled =
    BUNDLED_PATH_PATTERNS.some(r => r.test(rawInput)) ||
    BUNDLED_PATH_PATTERNS.some(r => r.test(cleaned));
  const isVendor =
    VENDOR_PATH_PATTERNS.some(r => r.test(rawInput)) ||
    VENDOR_PATH_PATTERNS.some(r => r.test(cleaned));
  const isTransient =
    TRANSIENT_PATH_PATTERNS.some(r => r.test(rawInput)) ||
    TRANSIENT_PATH_PATTERNS.some(r => r.test(cleaned));

  let normalized = cleaned;
  let isRepoLocal = false;

  if (isAbsolute(cleaned) && repoRoot) {
    // Already absolute — try to relativize against repoRoot.
    const rel = relative(repoRoot, cleaned);
    if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
      normalized  = rel.split(sep).join(posix.sep);  // always forward slashes
      isRepoLocal = true;
    }
  } else if (cleaned.startsWith('./') || cleaned.startsWith('../')) {
    normalized = cleaned.replace(/^\.\//, '');
    isRepoLocal = !cleaned.startsWith('../');
  } else if (cleaned && !cleaned.startsWith('/')) {
    // Bare relative path — assume repo-local until proven otherwise.
    normalized = cleaned;
    isRepoLocal = !isVendor && !isBundled && !isTransient;
  }

  return { raw: rawInput, normalized, isRepoLocal, isBundled, isVendor, isTransient };
}

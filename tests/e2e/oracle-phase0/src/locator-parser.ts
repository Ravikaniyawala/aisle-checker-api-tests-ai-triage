/**
 * Locator parser — extracts the failing locator from a Playwright error
 * message. Deterministic regex over surface text; no LLM, no semantic
 * understanding required.
 *
 * Real Playwright error shapes covered:
 *   - "waiting for locator('[data-test=\"product-list\"]')"
 *   - "waiting for getByTestId('product-list')"
 *   - "waiting for getByRole('button', { name: 'Checkout' })"
 *   - "waiting for getByText('Sign in')"
 *   - "Element is not visible: locator('input[type=password]')"
 *   - "Timeout exceeded ... locator('#submit')"
 *
 * Returns ParsedLocator with `confidence < 1.0` when the parser had to
 * fall back. Always returns *some* result if there's a `locator(...)` /
 * `getBy*(...)` / `[data-...="..."]` shape; returns `null` otherwise.
 */

import type { LocatorExpressionKind, ParsedLocator } from './types.ts';

/** Strip leading/trailing quotes and unescape \" sequences. */
function unquote(s: string): string {
  const trimmed = s.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return trimmed;
}

interface PatternMatcher {
  kind:    LocatorExpressionKind;
  regex:   RegExp;
  /** Confidence to assign when this matcher hits. */
  confidence: number;
  /** Transform a regex match into a ParsedLocator. */
  build:   (match: RegExpMatchArray) => Omit<ParsedLocator, 'raw' | 'confidence'>;
}

const PATTERNS: PatternMatcher[] = [
  // getByTestId('value')
  {
    kind: 'getByTestId',
    regex: /getByTestId\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/,
    confidence: 0.95,
    build: (m) => {
      const value = m[2] ?? '';
      // Test attribute defaults to data-testid; Playwright's
      // testIdAttribute config can change this. We capture both.
      return {
        kind:         'getByTestId',
        testAttribute: 'data-testid',
        value,
        cssSelector:  `[data-testid="${value}"]`,
      };
    },
  },

  // getByRole('button', { name: '...' })
  {
    kind: 'getByRole',
    regex: /getByRole\(\s*(['"`])([^'"`]+)\1(?:\s*,\s*\{\s*name\s*:\s*(['"`])([^'"`]+)\3\s*\})?\s*\)/,
    confidence: 0.95,
    build: (m) => ({
      kind:  'getByRole',
      value: m[4] ? `${m[2]}:${m[4]}` : m[2]!,
    }),
  },

  // getByText('value')
  {
    kind: 'getByText',
    regex: /getByText\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/,
    confidence: 0.90,
    build: (m) => ({ kind: 'getByText', value: m[2] }),
  },

  // getByLabel('value')
  {
    kind: 'getByLabel',
    regex: /getByLabel\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/,
    confidence: 0.90,
    build: (m) => ({ kind: 'getByLabel', value: m[2] }),
  },

  // getByPlaceholder('value')
  {
    kind: 'getByPlaceholder',
    regex: /getByPlaceholder\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/,
    confidence: 0.90,
    build: (m) => ({ kind: 'getByPlaceholder', value: m[2] }),
  },

  // locator('[data-test="x"]') or locator('[data-testid=x]') or [data-test="x"]
  {
    kind: 'attribute_selector',
    regex: /\[\s*(data-[a-z0-9_-]+)\s*=\s*(['"]?)([^'"\]]+)\2\s*\]/i,
    confidence: 0.85,
    build: (m) => ({
      kind:          'attribute_selector',
      testAttribute: m[1]!.toLowerCase(),
      value:         m[3],
      cssSelector:   m[0],
    }),
  },

  // locator('#id')
  {
    kind: 'css_selector',
    regex: /locator\(\s*(['"`])(#[a-zA-Z][\w-]*)\1\s*\)/,
    confidence: 0.80,
    build: (m) => ({
      kind:        'css_selector',
      value:       m[2],
      cssSelector: m[2],
    }),
  },

  // locator('.class') or locator('.parent .child')
  {
    kind: 'css_selector',
    regex: /locator\(\s*(['"`])(\.[\w-][\w\s.>+~\[\]"'=#-]*)\1\s*\)/,
    confidence: 0.75,
    build: (m) => ({
      kind:        'css_selector',
      value:       m[2],
      cssSelector: m[2],
    }),
  },

  // locator('input[type=password]') and other tag+attr forms
  {
    kind: 'css_selector',
    regex: /locator\(\s*(['"`])([a-zA-Z][a-zA-Z0-9]*\s*\[[^'"]*\])\1\s*\)/,
    confidence: 0.75,
    build: (m) => ({
      kind:        'css_selector',
      value:       m[2],
      cssSelector: m[2],
    }),
  },

  // locator('arbitrary selector string') — generic fallback
  {
    kind: 'css_selector',
    regex: /locator\(\s*(['"`])((?:\\.|(?!\1)[^\\])+)\1\s*\)/,
    confidence: 0.55,
    build: (m) => ({
      kind:        'css_selector',
      value:       m[2],
      cssSelector: m[2],
    }),
  },
];

/**
 * Parse the failing locator from a Playwright error message.
 *
 * Strategy: walk patterns in priority order. First match wins. Returns
 * `null` only when no locator-shaped substring is found at all.
 */
export function parseFailingLocator(errorMessage: string): ParsedLocator | null {
  if (!errorMessage || typeof errorMessage !== 'string') return null;

  for (const pattern of PATTERNS) {
    const match = errorMessage.match(pattern.regex);
    if (!match) continue;
    const built = pattern.build(match);
    return {
      raw:        match[0],
      confidence: pattern.confidence,
      ...built,
    };
  }

  return null;
}

/**
 * Helper: when given a raw selector string (e.g. `[data-test="x"]` or
 * `getByTestId('product-list')`), produce the same ParsedLocator shape.
 * Used by tests and the classifier when the input isn't a full error
 * message.
 *
 * Tries the raw input first so already-formed getBy() or attribute-selector
 * expressions match before falling back to wrapping in a synthetic
 * `locator()` call.
 */
export function parseLocatorExpression(raw: string): ParsedLocator | null {
  const normalized = raw.trim();
  if (!normalized) return null;

  const direct = parseFailingLocator(normalized);
  if (direct) return { ...direct, raw: normalized };

  // Fallback: wrap as a synthetic locator() call so CSS-style strings match.
  const wrapped = parseFailingLocator(
    `locator('${normalized.replace(/'/g, "\\'")}')`,
  );
  if (wrapped) return { ...wrapped, raw: normalized };

  return null;
}

/** Exported only for tests; lets us verify pattern priority. */
export const _patterns = PATTERNS;
export { unquote as _unquote };

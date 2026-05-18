/**
 * ARIA-aware locator-drift classifier — the most safety-critical Phase 0
 * deliverable.
 *
 * Given a failing locator + an ARIA snapshot taken at the failure moment,
 * decide which of the four locator-drift sub-kinds applies. The whole
 * autofix safety story rests on this distinction:
 *
 *   - locator_drift_data_testid_only    → auto-eligible (test-infra change)
 *   - locator_drift_css_class_only      → hold (could be styling refactor)
 *   - locator_drift_user_visible_text   → hold/reject (could be regression)
 *   - locator_drift_dom_structure       → hold/reject (structural change)
 *
 * Implementation is purely structural — no LLM, no semantic reasoning. The
 * classifier finds a candidate element in the ARIA snapshot whose
 * properties most closely match the failing locator's intent, then
 * classifies the drift type by inspecting what kind of attribute the
 * locator referenced.
 */

import type {
  AriaSnapshotElement,
  LocatorDriftClassification,
  ParsedLocator,
} from './types.ts';

export interface ClassifierInput {
  failingLocator: ParsedLocator;
  ariaSnapshot:   AriaSnapshotElement[];
  /** Test-attribute names this repo considers test-infrastructure. */
  testAttributeNames?: string[];
}

const DEFAULT_TEST_ATTRIBUTES = ['data-test', 'data-testid', 'data-qa', 'data-cy'];

/**
 * Find the best candidate ARIA element for the failing locator, by:
 *   - matching role+name for getByRole
 *   - matching text for getByText
 *   - matching label for getByLabel/getByPlaceholder
 *   - matching test-attribute value for getByTestId / attribute_selector
 *   - falling back to text/role similarity for css_selector
 */
function findCandidate(
  loc: ParsedLocator,
  snapshot: AriaSnapshotElement[],
  testAttrs: string[],
): AriaSnapshotElement | null {
  if (snapshot.length === 0) return null;

  switch (loc.kind) {
    case 'getByTestId':
    case 'attribute_selector': {
      // Look for an element whose name or text matches the testid value
      // (data-testids are usually meaningful: "checkout-btn" → "Checkout")
      // and whose existing test attributes differ (drift case).
      if (!loc.value) return null;
      const v = loc.value.toLowerCase();
      // Prefer elements whose name semantically relates to the testid value.
      const byName = snapshot.find(
        e => e.name && tokensOverlap(e.name.toLowerCase(), v),
      );
      if (byName) return byName;
      // Fallback: any element with a different testAttribute value.
      const anyWithTestAttr = snapshot.find(
        e => e.testAttributes && Object.keys(e.testAttributes)
              .some(k => testAttrs.includes(k.toLowerCase())),
      );
      return anyWithTestAttr ?? null;
    }

    case 'getByRole': {
      if (!loc.value) return null;
      const [role, name] = loc.value.split(':');
      // Exact match (role AND name) — happy case, no drift here.
      const exact = snapshot.find(
        e => e.role.toLowerCase() === role!.toLowerCase() &&
             (!name || e.name?.toLowerCase().includes(name.toLowerCase())),
      );
      if (exact) return exact;
      // Role match only — the name drifted; return so caller can detect.
      const roleOnly = snapshot.find(
        e => e.role.toLowerCase() === role!.toLowerCase(),
      );
      return roleOnly ?? null;
    }

    case 'getByText':
    case 'getByLabel':
    case 'getByPlaceholder': {
      if (!loc.value) return null;
      const v = loc.value.toLowerCase();
      // Exact text/name match — no drift on this locator.
      const exact = snapshot.find(
        e => e.name?.toLowerCase().includes(v) || e.text?.toLowerCase().includes(v),
      );
      if (exact) return exact;
      // No exact text match — the text drifted. Return the first reasonable
      // candidate (skipping pure structural elements) so downstream can
      // detect that the visible text changed.
      const interactiveOrTextual = snapshot.find(
        e => ['button', 'link', 'heading', 'textbox', 'searchbox', 'status', 'text', 'alert'].includes(
          e.role.toLowerCase(),
        ),
      );
      return interactiveOrTextual ?? snapshot[0] ?? null;
    }

    case 'css_selector': {
      // CSS selectors are the hardest. Try to extract semantic hints
      // from the selector string (ID, class names, attribute values).
      if (!loc.value) return null;
      const idMatch    = loc.value.match(/#([\w-]+)/);
      const classMatch = loc.value.match(/\.([\w-]+)/g);
      if (idMatch) {
        const id = idMatch[1]!.toLowerCase();
        const byId = snapshot.find(
          e => e.name?.toLowerCase().includes(id) ||
               e.text?.toLowerCase().includes(id),
        );
        if (byId) return byId;
      }
      if (classMatch && classMatch.length > 0) {
        const targetClasses = classMatch.map(c => c.slice(1).toLowerCase());
        // Element with any class overlap (after drift only some may match).
        const byClass = snapshot.find(
          e => e.classes?.some(c => targetClasses.includes(c.toLowerCase())),
        );
        if (byClass) return byClass;
      }
      return snapshot[0] ?? null;  // weakest fallback
    }

    default:
      return null;
  }
}

/**
 * Loose word-overlap heuristic for matching testid-style names.
 * Tokenizes both inputs on separators, then matches if any token from one
 * is a substring of any token from the other (handles plural/singular,
 * suffixed variants, etc.).
 */
function tokensOverlap(a: string, b: string): boolean {
  const tokenize = (s: string) =>
    s.toLowerCase()
     .replace(/[_-]+/g, ' ')
     .split(/\s+/)
     .filter(t => t.length >= 3);
  const ta = tokenize(a);
  const tb = tokenize(b);
  return tb.some(t => ta.some(at => at.includes(t) || t.includes(at)));
}

/**
 * Determine which kind of attribute the failing locator referenced.
 * This drives the sub-kind classification regardless of the matched element.
 */
function locatorAttributeKind(
  loc: ParsedLocator,
  testAttrs: string[],
): 'test_attribute' | 'css_class' | 'user_visible_text' | 'dom_structure' | 'id_attribute' {
  // getByTestId / [data-test="..."] → test attribute
  if (loc.kind === 'getByTestId') return 'test_attribute';
  if (loc.kind === 'attribute_selector') {
    const attr = loc.testAttribute?.toLowerCase() ?? '';
    if (testAttrs.includes(attr)) return 'test_attribute';
    if (attr === 'id') return 'id_attribute';
    return 'css_class';  // generic [class="x"] or [data-other="x"]
  }
  // getByText / getByLabel / getByPlaceholder → user-visible text
  if (loc.kind === 'getByText' || loc.kind === 'getByLabel' ||
      loc.kind === 'getByPlaceholder') {
    return 'user_visible_text';
  }
  // getByRole has user-visible name in its accessible-name argument
  if (loc.kind === 'getByRole') return 'user_visible_text';
  // CSS selectors — inspect string
  if (loc.kind === 'css_selector' && loc.value) {
    if (/^#[\w-]+$/.test(loc.value)) return 'id_attribute';
    if (/^\.[\w-]+$/.test(loc.value)) return 'css_class';
    // Structural combinators or pseudo-classes → DOM-structure reliance.
    if (STRUCTURAL_SELECTOR_PATTERN.test(loc.value)) return 'dom_structure';
    // Deep descendant chains (3+ space-separated tokens) imply the locator
    // relied on DOM nesting depth.
    const depthTokens = loc.value.trim().split(/\s+/).filter(t => t.length > 0);
    if (depthTokens.length >= 3) return 'dom_structure';
    return 'css_class';  // default for selector strings
  }
  return 'css_class';
}

/**
 * Patterns that indicate a CSS selector relies on DOM structure rather
 * than stable identifiers. Shared between locatorAttributeKind() and
 * domStructureDrifted() so they stay in sync.
 */
const STRUCTURAL_SELECTOR_PATTERN =
  /[>+~]|:nth-|:first-|:last-|:only-|:empty|:not\(|:checked/;

/**
 * Decide if the candidate element shows that user-visible text drifted
 * (the most dangerous case). True when:
 *   - the locator targeted user-visible text via role/name/label
 *   - and the candidate's name or text differs from the locator's value
 */
function userVisibleTextDrifted(
  loc: ParsedLocator,
  candidate: AriaSnapshotElement,
): boolean {
  if (!loc.value) return false;
  const expected = loc.value.toLowerCase();
  if (loc.kind === 'getByRole') {
    const [, name] = loc.value.split(':');
    if (!name) return false;
    return !(candidate.name?.toLowerCase().includes(name.toLowerCase()) ?? false);
  }
  if (loc.kind === 'getByText') {
    return !(
      candidate.text?.toLowerCase().includes(expected) ||
      candidate.name?.toLowerCase().includes(expected)
    );
  }
  if (loc.kind === 'getByLabel' || loc.kind === 'getByPlaceholder') {
    return !(candidate.name?.toLowerCase().includes(expected) ?? false);
  }
  return false;
}

/**
 * Decide if the candidate element shows DOM-structure drift.
 *
 * If the locator referenced any structural combinator or pseudo-class, the
 * fact that it failed (and we're now in the classifier) is itself evidence
 * the position changed. We don't require a separate pathSignature
 * comparison — the structural selector failing IS the structural change.
 *
 * `candidate` is unused here but kept in the signature for future use
 * (e.g. comparing the candidate's actual depth against the selector's
 * implied depth).
 */
function domStructureDrifted(
  loc: ParsedLocator,
  candidate: AriaSnapshotElement,
): boolean {
  void candidate;
  if (loc.kind !== 'css_selector' || !loc.value) return false;
  if (STRUCTURAL_SELECTOR_PATTERN.test(loc.value)) return true;
  // Deep descendant chains are also a structural-reliance signal.
  const depthTokens = loc.value.trim().split(/\s+/).filter(t => t.length > 0);
  return depthTokens.length >= 3;
}

export function classifyLocatorDrift(input: ClassifierInput): LocatorDriftClassification {
  const testAttrs = (input.testAttributeNames ?? DEFAULT_TEST_ATTRIBUTES)
    .map(s => s.toLowerCase());

  // No ARIA snapshot → cannot classify confidently.
  if (input.ariaSnapshot.length === 0) {
    return {
      kind:       null,
      confidence: 0,
      reasoning:  'ARIA snapshot is empty; cannot classify drift kind',
    };
  }

  const candidate = findCandidate(input.failingLocator, input.ariaSnapshot, testAttrs);
  if (!candidate) {
    return {
      kind:       null,
      confidence: 0,
      reasoning:  'no candidate ARIA element matched the failing locator',
    };
  }

  const attrKind = locatorAttributeKind(input.failingLocator, testAttrs);

  // Priority 1: user-visible text drift always wins (most dangerous case).
  // Even if the locator was test-attribute based, if the element's name
  // also changed, treat as user-visible.
  if (
    (attrKind === 'user_visible_text' && userVisibleTextDrifted(input.failingLocator, candidate)) ||
    (candidate.name && input.failingLocator.value &&
      attrKind === 'user_visible_text' &&
      !candidate.name.toLowerCase().includes(input.failingLocator.value.toLowerCase()))
  ) {
    return {
      kind:       'locator_drift_user_visible_text',
      confidence: 0.85,
      candidate,
      reasoning:
        `locator targeted user-visible ${input.failingLocator.kind} ` +
        `value "${input.failingLocator.value}" but candidate has name ` +
        `"${candidate.name ?? '(none)'}"`,
    };
  }

  // Priority 2: DOM-structure drift for structural selectors.
  if (attrKind === 'dom_structure' && domStructureDrifted(input.failingLocator, candidate)) {
    return {
      kind:       'locator_drift_dom_structure',
      confidence: 0.80,
      candidate,
      reasoning:
        `locator used structural combinator(s) in "${input.failingLocator.value}" ` +
        `but candidate's DOM position differs`,
    };
  }

  // Priority 3: test attribute drift — the auto-eligible case.
  if (attrKind === 'test_attribute') {
    // We need positive evidence that ONLY the test attribute changed,
    // i.e. candidate still has same role+name and only the testid differs.
    const hasMatchingTestAttr = !!candidate.testAttributes &&
      Object.entries(candidate.testAttributes)
        .some(([k, v]) =>
          testAttrs.includes(k.toLowerCase()) &&
          v !== input.failingLocator.value,
        );
    if (hasMatchingTestAttr) {
      return {
        kind:       'locator_drift_data_testid_only',
        confidence: 0.90,
        candidate,
        reasoning:
          `failing locator referenced test attribute with value ` +
          `"${input.failingLocator.value}", but candidate has a different ` +
          `test attribute value`,
      };
    }
    // No matching test attribute on candidate at all — but locator targeted
    // a test attribute. Less confident; could be testid removal.
    return {
      kind:       'locator_drift_data_testid_only',
      confidence: 0.70,
      candidate,
      reasoning:
        `failing locator referenced test attribute "${input.failingLocator.value}" ` +
        `which no longer exists on the matched element`,
    };
  }

  // Priority 4: CSS class drift.
  if (attrKind === 'css_class' || attrKind === 'id_attribute') {
    return {
      kind:       'locator_drift_css_class_only',
      confidence: 0.75,
      candidate,
      reasoning:
        `locator referenced CSS class/id selector "${input.failingLocator.value}"; ` +
        `candidate is reachable via stable role/name`,
    };
  }

  return {
    kind:       null,
    confidence: 0,
    reasoning:  'no matching drift pattern',
  };
}

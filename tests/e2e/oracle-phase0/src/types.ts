/**
 * Phase 0 validation types.
 *
 * Mirrors the relevant subset of the upstream Oracle autofix detector
 * schema defined in ai-oracle-triage/docs/autofix-design.md. We do NOT
 * import from Oracle — Phase 0 is intentionally decoupled so Phase 1 can
 * own the canonical type definitions when it ships.
 */

export type RepoTopology = 'monorepo_unit' | 'monorepo_e2e' | 'split_e2e';

export type TopologyState = 'full' | 'partial' | 'failed';

export interface TopologyValidationResult {
  declared:            RepoTopology;
  state:               TopologyState;
  validationFailures:  string[];
  validationWarnings:  string[];
  resolvedAllowedEditPaths:        string[];   // sample files matched
  resolvedProductSourcePaths:      string[];   // sample files matched (post-exclusion)
  appChangeVisibilityProven:       boolean;    // true if at least one historical PR
                                                // context overlapped with product paths
}

// ── Locator parser ──────────────────────────────────────────────────────────

export type LocatorExpressionKind =
  | 'getByTestId'
  | 'getByRole'
  | 'getByText'
  | 'getByLabel'
  | 'getByPlaceholder'
  | 'css_selector'
  | 'attribute_selector'    // e.g. [data-test="x"]
  | 'unknown';

export interface ParsedLocator {
  /** Raw expression string from the error (verbatim). */
  raw:           string;
  kind:          LocatorExpressionKind;
  /** Test-attribute name when kind suggests it (e.g. 'data-test'). */
  testAttribute?: string;
  /** Value passed to the locator (e.g. 'product-list' for getByTestId). */
  value?:        string;
  /** Resolved CSS selector when derivable (best-effort). */
  cssSelector?:  string;
  /** Confidence in parsing 0-1. <1.0 means the parser fell back. */
  confidence:    number;
}

// ── Path normalizer / provenance ────────────────────────────────────────────

export type StackFrameProvenance = 'trusted' | 'untrusted';

export interface NormalizedStackFrame {
  raw:           string;
  file:          string;          // absolute or as-given
  normalized:    string;          // repo-relative when resolvable, else file
  line?:         number;
  column?:       number;
  provenance:    StackFrameProvenance;
  reason:        string;          // why this provenance verdict
}

// ── ARIA-aware locator-drift classifier ─────────────────────────────────────

export type LocatorDriftKind =
  | 'locator_drift_data_testid_only'
  | 'locator_drift_css_class_only'
  | 'locator_drift_user_visible_text'
  | 'locator_drift_dom_structure';

export interface AriaSnapshotElement {
  role:           string;
  name?:          string;         // accessible name
  testAttributes?: Record<string, string>;  // e.g. { 'data-test': 'product-list' }
  classes?:       string[];
  /** Stable path identity in the rendered tree (for DOM-structure comparison). */
  pathSignature?: string;
  /** Free-form text content (used as fallback identity for buttons/links). */
  text?:          string;
}

export interface LocatorDriftClassification {
  kind:           LocatorDriftKind | null;
  confidence:     number;          // 0-1
  candidate?:     AriaSnapshotElement;  // matched ARIA element
  reasoning:      string;
}

// ── Reporter output ─────────────────────────────────────────────────────────

export interface FailurePromptArtifact {
  testFile:        string;
  testTitle:       string;
  errorMessage:    string;
  failingLocator?: ParsedLocator;
  testCodeSnippet?: string;
  ariaSnapshot?:   string;        // raw YAML/markdown ARIA snapshot text
  framesNormalized: NormalizedStackFrame[];
  artifactTrustLevel: 'trusted' | 'partial' | 'untrusted';
  /** Path to the canonical prompt.md when written. */
  promptMdPath?:   string;
}

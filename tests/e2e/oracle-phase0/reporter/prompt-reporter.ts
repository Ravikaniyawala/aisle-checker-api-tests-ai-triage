/**
 * Playwright reporter — emits a prompt.md per failure plus a sidecar JSON
 * with the structured data Oracle's detector will consume.
 *
 * Output layout (per failure):
 *   test-results/failure-context/<test-id>/prompt.md   — human/LLM-readable
 *   test-results/failure-context/<test-id>/data.json   — structured envelope
 *
 * The prompt.md format mirrors Playwright's "Copy prompt" feature so the
 * downstream healer can feed it to an LLM verbatim.
 */

import type {
  Reporter,
  TestCase,
  TestResult,
  TestError,
  FullConfig,
  Suite,
} from '@playwright/test/reporter';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { parseFailingLocator } from '../src/locator-parser.ts';
import { buildNormalizedFrame } from '../src/provenance-checker.ts';
import type { FailurePromptArtifact, NormalizedStackFrame } from '../src/types.ts';

interface PromptReporterOptions {
  /** Directory to write failure-context output, relative to CWD. */
  outputDir?:     string;
  /** Repo root; used for path normalization. */
  repoRoot?:      string;
  /** Print a summary to stdout when the run ends. */
  printSummary?:  boolean;
}

export default class PromptReporter implements Reporter {
  private readonly options:    Required<PromptReporterOptions>;
  private          rootSuite!: Suite;
  private          emitted:    string[] = [];

  constructor(options: PromptReporterOptions = {}) {
    this.options = {
      outputDir:    options.outputDir ?? 'test-results/failure-context',
      repoRoot:     options.repoRoot  ?? process.cwd(),
      printSummary: options.printSummary ?? true,
    };
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.rootSuite = suite;
    void this.rootSuite;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'failed' && result.status !== 'timedOut') return;
    if (!result.errors || result.errors.length === 0) return;

    try {
      const artifact = this.buildArtifact(test, result);
      const dir = join(this.options.outputDir, this.testIdSlug(test));
      mkdirSync(dir, { recursive: true });

      const promptPath = join(dir, 'prompt.md');
      const dataPath   = join(dir, 'data.json');
      const promptText = renderPromptMd(artifact);

      writeFileSync(promptPath, promptText, 'utf8');
      writeFileSync(dataPath, JSON.stringify({ ...artifact, promptMdPath: promptPath }, null, 2), 'utf8');

      this.emitted.push(promptPath);
    } catch (err) {
      // Reporter errors must NEVER fail tests; log and continue.
      // eslint-disable-next-line no-console
      console.warn('[oracle-phase0] reporter failed for', test.title, err);
    }
  }

  onEnd(): void {
    if (!this.options.printSummary) return;
    if (this.emitted.length === 0) return;
    // eslint-disable-next-line no-console
    console.log(
      `[oracle-phase0] emitted ${this.emitted.length} failure-context artifact(s):`,
    );
    for (const p of this.emitted) {
      // eslint-disable-next-line no-console
      console.log(`  - ${p}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /**
   * Slug the test identity. Playwright doesn't expose a stable id directly
   * in older versions; we synthesize one from file + title + project.
   */
  private testIdSlug(test: TestCase): string {
    const project = test.parent.project()?.name ?? 'default';
    const titlePath = test.titlePath().join(' › ');
    return slugify(`${project}__${test.location.file.replace(/[/\\]/g, '_')}__${titlePath}`)
      .slice(0, 200);
  }

  private buildArtifact(test: TestCase, result: TestResult): FailurePromptArtifact {
    const primaryError = result.errors[0]!;
    const errorMessage = collectErrorMessage(primaryError);
    const failingLocator = parseFailingLocator(errorMessage);

    const framesNormalized = buildNormalizedFrames(
      primaryError, result.errors.slice(1), this.options.repoRoot,
    );

    const testCodeSnippet = readTestCodeSnippet(
      primaryError.location?.file ?? test.location.file,
      primaryError.location?.line ?? test.location.line,
      3,
    );

    const artifact: FailurePromptArtifact = {
      testFile:           relative(this.options.repoRoot, test.location.file)
                            .split(/[/\\]/).join('/'),
      testTitle:          test.title,
      errorMessage,
      framesNormalized,
      artifactTrustLevel: deriveTrustLevel(framesNormalized),
    };

    if (failingLocator) artifact.failingLocator = failingLocator;
    if (testCodeSnippet) artifact.testCodeSnippet = testCodeSnippet;

    // ARIA snapshot: read the `aria-snapshot.yaml` attachment emitted
    // by the test fixture in `tests/e2e/src/fixtures/base.ts`. The
    // fixture runs in `afterEach` while `page` is still live and walks
    // the DOM to produce a Playwright-style ARIA YAML enriched with
    // [data-test=...] bracket annotations.
    //
    // Oracle's `autofix-aria-loader.ts#parseAriaSnapshot()` already
    // understands this format — `data-*` keys inside the [] block
    // become `AriaSnapshotElement.testAttributes`. That's what the
    // locator-drift classifier needs to produce
    // `locator_drift_data_testid_only` with high confidence.
    //
    // Prior to this wiring (PR-ARIA-CAPTURE) the reporter deliberately
    // skipped ARIA capture, citing trace-viewer internals being
    // unstable; since Playwright 1.59 `page.ariaSnapshot()` is a
    // stable public API and the DOM-walk approach below is even
    // simpler.
    const ariaYaml = extractAriaSnapshotAttachment(result);
    if (ariaYaml) artifact.ariaSnapshot = ariaYaml;

    return artifact;
  }
}

/**
 * Read the `aria-snapshot.yaml` attachment emitted by the test fixture.
 * Handles both shapes Playwright uses for attachments:
 *
 *   - `att.body` is a Buffer (small attachments inlined into the
 *     report)
 *   - `att.path` points at a file on disk (larger attachments,
 *     screenshots, etc.)
 *
 * Returns undefined when:
 *   - no attachment with the expected name is present (e.g. fixture
 *     short-circuited because the test passed, or page was closed
 *     before capture)
 *   - the body/file is unreadable or empty
 *
 * Exported for unit testing.
 */
export function extractAriaSnapshotAttachment(result: TestResult): string | undefined {
  for (const att of result.attachments ?? []) {
    if (att.name !== 'aria-snapshot.yaml') continue;
    let body: string | undefined;
    if (att.body) {
      body = att.body.toString('utf8');
    } else if (att.path && existsSync(att.path)) {
      try {
        body = readFileSync(att.path, 'utf8');
      } catch {
        return undefined;
      }
    }
    if (body && body.length > 0) return body;
  }
  return undefined;
}

// ── Pure helpers (exported for tests) ───────────────────────────────────

export function slugify(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function collectErrorMessage(err: TestError): string {
  const parts: string[] = [];
  if (err.message) parts.push(err.message);
  if (err.stack && !parts.join('\n').includes(err.stack)) parts.push(err.stack);
  return parts.join('\n').trim();
}

export function readTestCodeSnippet(
  file:    string,
  line:    number | undefined,
  context: number,
): string | undefined {
  if (!file || !line || !existsSync(file)) return undefined;
  try {
    const src = readFileSync(file, 'utf8').split(/\r?\n/);
    const start = Math.max(1, line - context);
    const end   = Math.min(src.length, line + context);
    const out: string[] = [];
    for (let i = start; i <= end; i++) {
      const marker = i === line ? '>' : ' ';
      const padded = i.toString().padStart(4, ' ');
      out.push(`${marker} ${padded} | ${src[i - 1] ?? ''}`);
    }
    return out.join('\n');
  } catch {
    return undefined;
  }
}

export function buildNormalizedFrames(
  primaryError:  TestError,
  otherErrors:   TestError[],
  repoRoot:      string,
): NormalizedStackFrame[] {
  const out: NormalizedStackFrame[] = [];
  const lines: string[] = [];

  if (primaryError.stack) lines.push(...splitStackLines(primaryError.stack));
  for (const e of otherErrors) {
    if (e.stack) lines.push(...splitStackLines(e.stack));
  }

  for (const line of lines) {
    if (!/[\w/.\\:-]+:\d+(:\d+)?/.test(line)) continue;
    out.push(buildNormalizedFrame(line, repoRoot));
  }

  return out;
}

function splitStackLines(stack: string): string[] {
  return stack
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('at ') || /:\d+:\d+/.test(l));
}

export function deriveTrustLevel(
  frames: NormalizedStackFrame[],
): 'trusted' | 'partial' | 'untrusted' {
  if (frames.length === 0) return 'untrusted';
  const userFrames = frames.filter(f => !f.normalized.includes('node_modules/'));
  if (userFrames.length === 0) return 'untrusted';
  const trusted = userFrames.filter(f => f.provenance === 'trusted').length;
  if (trusted === userFrames.length) return 'trusted';
  if (trusted === 0) return 'untrusted';
  return 'partial';
}

export function renderPromptMd(artifact: FailurePromptArtifact): string {
  const lines: string[] = [];
  lines.push('# Test failure prompt');
  lines.push('');
  lines.push('Explain the failure below and provide a fix. Be concise, respect Playwright best practices.');
  lines.push('');
  lines.push(`**Test file:** \`${artifact.testFile}\``);
  lines.push(`**Test title:** ${artifact.testTitle}`);
  lines.push('');
  lines.push('## Error');
  lines.push('```');
  lines.push(artifact.errorMessage.slice(0, 4000));
  lines.push('```');
  lines.push('');
  if (artifact.failingLocator) {
    lines.push('## Failing locator');
    lines.push('```');
    lines.push(`kind: ${artifact.failingLocator.kind}`);
    if (artifact.failingLocator.value) lines.push(`value: ${artifact.failingLocator.value}`);
    if (artifact.failingLocator.cssSelector) lines.push(`selector: ${artifact.failingLocator.cssSelector}`);
    lines.push(`confidence: ${artifact.failingLocator.confidence.toFixed(2)}`);
    lines.push('```');
    lines.push('');
  }
  if (artifact.testCodeSnippet) {
    lines.push('## Test code');
    lines.push('```');
    lines.push(artifact.testCodeSnippet);
    lines.push('```');
    lines.push('');
  }
  if (artifact.ariaSnapshot) {
    lines.push('## ARIA snapshot at failure');
    lines.push('```');
    lines.push(artifact.ariaSnapshot.slice(0, 8000));
    lines.push('```');
    lines.push('');
  }
  lines.push('## Stack frames (normalized)');
  for (const f of artifact.framesNormalized.slice(0, 10)) {
    lines.push(`- ${f.normalized}:${f.line ?? '?'} — ${f.provenance} (${f.reason})`);
  }
  lines.push('');
  lines.push(`> Artifact trust level: \`${artifact.artifactTrustLevel}\``);
  return lines.join('\n');
}


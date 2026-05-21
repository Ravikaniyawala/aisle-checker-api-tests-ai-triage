import { test as base } from '@playwright/test'
import { ProductsPage } from '../pages/ProductsPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { StoresPage } from '../pages/StoresPage'

type PageFixtures = {
  productsPage: ProductsPage
  productDetailPage: ProductDetailPage
  storesPage: StoresPage
}

export const test = base.extend<PageFixtures>({
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page))
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page))
  },
  storesPage: async ({ page }, use) => {
    await use(new StoresPage(page))
  },
})

// ── Oracle Phase 0: ARIA-snapshot-on-failure capture ─────────────────────
//
// On every test failure, walk the live DOM and emit a Playwright-style
// ARIA snapshot enriched with [data-test=...] / [data-testid=...]
// annotations. Oracle's existing `parseAriaSnapshot()` already understands
// this format (see ai-oracle-triage/src/autofix-aria-loader.ts:122-141 —
// the [...] bracket block is parsed into `AriaSnapshotElement.testAttributes`),
// so the captured YAML flows straight into the locator-drift classifier
// without any Oracle-side changes.
//
// Why this matters: without test-attribute evidence in the ARIA snapshot,
// the classifier can never produce `locator_drift_data_testid_only` with
// the high confidence Gate 15 requires. Pre-this-fix, the Phase 0 reporter
// captured `failingLocator` from the error message but emitted no ARIA at
// all — every drift sat at the source-unknown gate.
//
// Gated on ORACLE_PHASE0=1 so local `npx playwright test` runs aren't
// slowed down. The CI's e2e-tests job sets this env var.
test.afterEach(async ({ page }, testInfo) => {
  if (process.env.ORACLE_PHASE0 !== '1') return
  if (testInfo.status === 'passed' || testInfo.status === 'skipped') return
  try {
    const yaml = await page.evaluate(() => {
      // Test-attribute names match Oracle's DEFAULT_TEST_ATTRIBUTE_NAMES
      // (see ai-oracle-triage/src/autofix-detector/types.ts). data-test
      // is aisle-checker's primary attribute (per playwright.config.ts
      // `testIdAttribute: 'data-test'`).
      const TEST_ATTR_NAMES = ['data-test', 'data-testid', 'data-qa', 'data-cy']
      const MAX_NAME_LEN    = 80
      const MAX_ELEMENTS    = 500   // hard cap on output size

      // Strip characters that break Oracle's YAML parser regex:
      //   - double quotes terminate the name capture (`"([^"]*)"`)
      //   - newlines break the line-based scan
      //   - backslashes are not unescaped by the parser
      // Strip rather than escape: the parser doesn't support escapes.
      function safeName(s: string): string {
        return s
          .replace(/[\r\n"\\]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, MAX_NAME_LEN)
      }

      // Strip characters that break the [attr=value] block:
      //   - `]` would terminate the bracket prematurely
      //   - whitespace would split into multiple tokens
      //   - `"` would create parser ambiguity
      function safeAttrValue(s: string): string {
        return s
          .replace(/[\[\]\s"\\]+/g, '_')
          .slice(0, MAX_NAME_LEN)
      }

      const lines: string[] = []
      const elements = document.querySelectorAll('*')
      for (const el of Array.from(elements)) {
        if (lines.length >= MAX_ELEMENTS) break

        const testAttrTokens: string[] = []
        for (const attrName of TEST_ATTR_NAMES) {
          const v = el.getAttribute(attrName)
          if (v !== null && v !== '') {
            testAttrTokens.push(`${attrName}=${safeAttrValue(v)}`)
          }
        }
        const ariaLabel = el.getAttribute('aria-label')
        const roleAttr  = el.getAttribute('role')

        // Skip elements with no signal Oracle's classifier cares about.
        // Reduces the attachment to KB-scale on typical pages.
        if (testAttrTokens.length === 0 && !roleAttr && !ariaLabel) continue

        // Role: explicit role attr wins; fall back to lowercased tag name
        // (Playwright's ARIA snapshot uses similar inference). Tag-name
        // role won't match Oracle's role-equality checks for HTMLDivElement
        // etc., but the test-attribute path is what we actually rely on
        // for `locator_drift_data_testid_only`.
        const role = (roleAttr ?? el.tagName).toLowerCase()

        // Name: prefer aria-label, fall back to a trimmed innerText
        // snippet. Skip the name segment when nothing useful is present.
        const innerText = (el as HTMLElement).innerText ?? ''
        const rawName   = ariaLabel ?? innerText
        const cleanName = rawName ? safeName(rawName) : ''

        const namePart = cleanName ? ` "${cleanName}"` : ''
        const attrPart = testAttrTokens.length > 0 ? ` [${testAttrTokens.join(' ')}]` : ''
        lines.push(`- ${role}${namePart}${attrPart}`)
      }
      return lines.join('\n')
    })

    if (!yaml || yaml.length === 0) return

    await testInfo.attach('aria-snapshot.yaml', {
      body:         yaml,
      contentType: 'application/yaml',
    })
  } catch (err) {
    // Page might be closed (navigation, browser crash, test timeout
    // hit BEFORE the evaluate roundtrip). Capture is best-effort —
    // never throw from a reporter hook.
    // eslint-disable-next-line no-console
    console.warn(
      '[oracle-phase0/fixture] aria-snapshot capture failed:',
      err instanceof Error ? err.message : String(err),
    )
  }
})

export { expect } from '@playwright/test'

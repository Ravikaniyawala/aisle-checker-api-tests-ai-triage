import { test, expect } from '../../src/fixtures/base'
import { testTags } from '../../src/helpers/testTags'
import {
  products,
  inStockProduct,
  outOfStockProduct,
  lowStockProduct,
} from '../../src/test-data/products'

test.describe('Products page', () => {

  // EXPERIMENT — flake-shaped failure pattern for Oracle classification study.
  //
  // Design goal: a deterministically-failing test whose ERROR MESSAGE reads
  // like a transient flake, so we can see whether Oracle's API-side triage
  // classifies "TimeoutError waiting for X" as FLAKY (the only category that
  // survives Gate 1 to reach the autofix routing matrix).
  //
  // Pattern choice:
  //   * `getByTestId('availability-badge-loading-spinner')` — a plausibly-
  //     named loading-state testid that does NOT exist in the DOM. The
  //     neighboring real testid is `availability-badge`, giving the
  //     locator-drift classifier high-similarity ARIA evidence to match
  //     against if it gets there.
  //   * `{ timeout: 500 }` — tight enough to fail fast, long enough to
  //     look like a "real test author chose a wait window" rather than
  //     an obviously-fake `{ timeout: 1 }`.
  //   * `toBeVisible()` rather than `toHaveText()` — `waiting for X to be
  //     visible` is the canonical Playwright timeout phrase associated
  //     with flakiness in instinct learning corpora.
  //
  // Expected error shape:
  //   Error: expect(locator).toBeVisible() failed
  //   Locator: getByTestId('availability-badge-loading-spinner')
  //   Expected: visible
  //   Timeout: 500ms
  //
  // Hypotheses on Oracle classification:
  //   H1 (FLAKY): "Timeout" + "waiting for" heuristics trigger; auto-path
  //               opens. The detector would then need ariaSnapshot evidence
  //               (which the new fixture now provides) to classify the
  //               drift kind.
  //   H2 (NEW_BUG): consistent locator-not-found reads as removed element;
  //                Oracle treats the assertion as authoritative.
  //   H3 (REGRESSION): same family as H2 but with code-history weighting.
  //
  // Whichever fires is the data point — H1 unlocks the full auto path,
  // H2/H3 means heuristic FLAKY-recognition requires instinct learning.
  test(`${testTags.SMOKE} ${testTags.PRODUCTS} FLAKE-T: simulated transient locator timeout`, async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('availability-badge-loading-spinner'))
      .toBeVisible({ timeout: 500 })
  })

  test(`${testTags.SMOKE} ${testTags.PRODUCTS} PROD-001: products page loads and displays all products`, async ({
    productsPage,
  }) => {
    await productsPage.goto()
    await productsPage.expectLoaded()
    await productsPage.expectProductCount(products.length)
  })

  test(`${testTags.REGRESSION} ${testTags.PRODUCTS} PROD-002: each product card shows name, price, aisle, and availability badge`, async ({
    productsPage,
  }) => {
    await productsPage.goto()
    await productsPage.expectLoaded()

    for (const product of products) {
      await productsPage.expectProductVisible(product.name)
      await productsPage.expectCardShowsPrice(product.name, product.price)
      await productsPage.expectCardShowsAisle(product.name, product.aisle)
      await productsPage.expectCardShowsAvailability(product.name, product.availability)
    }
  })

  test(`${testTags.REGRESSION} ${testTags.PRODUCTS} PROD-003: in-stock product shows correct badge`, async ({
    productsPage,
  }) => {
    await productsPage.goto()
    await productsPage.expectLoaded()
    await productsPage.expectCardShowsAvailability(inStockProduct.name, 'in_stock')
    const card = await productsPage.getCardByName(inStockProduct.name)
    await expect(card.getByTestId('availability-badge')).toHaveText('In Stock')
  })

  test(`${testTags.REGRESSION} ${testTags.PRODUCTS} PROD-004: out-of-stock product shows correct badge`, async ({
    productsPage,
  }) => {
    await productsPage.goto()
    await productsPage.expectLoaded()
    await productsPage.expectCardShowsAvailability(outOfStockProduct.name, 'out_of_stock')
    const card = await productsPage.getCardByName(outOfStockProduct.name)
    await expect(card.getByTestId('availability-badge')).toHaveText('Out of Stock')
  })

  test(`${testTags.REGRESSION} ${testTags.PRODUCTS} PROD-005: low-stock product shows correct badge`, async ({
    productsPage,
  }) => {
    await productsPage.goto()
    await productsPage.expectLoaded()
    await productsPage.expectCardShowsAvailability(lowStockProduct.name, 'low_stock')
    const card = await productsPage.getCardByName(lowStockProduct.name)
    await expect(card.getByTestId('availability-badge')).toHaveText('Low Stock')
  })

  test(`${testTags.REGRESSION} ${testTags.PRODUCTS} PROD-006: clicking a product card navigates to product detail`, async ({
    productsPage,
    page,
  }) => {
    await productsPage.goto()
    await productsPage.expectLoaded()
    await productsPage.clickProduct(inStockProduct.name)
    await expect(page.getByTestId('product-detail-page')).toBeVisible()
    await expect(page.getByTestId('detail-product-name')).toHaveText(inStockProduct.name)
  })

})

import { test, expect } from '../../src/fixtures/base'
import { testTags } from '../../src/helpers/testTags'
import {
  products,
  inStockProduct,
  outOfStockProduct,
  lowStockProduct,
} from '../../src/test-data/products'

test.describe('Products page', () => {

  // EXPERIMENT — token-overlapping testid drift for classifier exercise.
  //
  // Builds on the prior flake-shaped-failure experiment (PR/run 26206468080)
  // which proved the TimeoutError shape produces a FLAKY classification.
  // That run held with `repairability_insufficient` because the failing
  // testid `availability-badge-loading-spinner` shared no name tokens with
  // any ARIA element (`findCandidate()` is intentionally conservative —
  // see Codex P0 #1 guard in autofix-detector/locator-drift-classifier.ts).
  //
  // This experiment uses `in-stock-badge` which shares the "stock" token
  // with the existing element `span "In Stock" [data-test=availability-badge]`.
  // The classifier's tokensOverlap() helper will fire on the shared "stock"
  // token (tokens of length ≥3, "-" treated as separator).
  //
  // Local simulation against the prior run's ARIA snapshot:
  //   drift.kind:       'locator_drift_data_testid_only'  ← AUTO-eligible
  //   drift.confidence: 0.90                              ← clears Gate 15
  //   candidate.name:   "...In Stock..."                  ← token-overlap winner
  //
  // Expected queue entry shape (topology=partial still demotes auto→propose):
  //   {
  //     "category":        "FLAKY",
  //     "decision":        "held",
  //     "decisionReason":  "mode_propose",     ← Gate 18 (not Gate 13 this time)
  //     "driftKind":       "locator_drift_data_testid_only",
  //     "driftConfidence": 0.90,
  //     "effectiveMode":   "propose"
  //   }
  //
  // That's the maximum aisle-checker can produce today. To go beyond `held`
  // to `approved` we'd need topology to upgrade from partial to full — that
  // requires the topology validator to see ≥1 historical PR file path
  // overlapping product source patterns (apps/*/src/**), which builds up
  // organically as PRs land.
  test(`${testTags.SMOKE} ${testTags.PRODUCTS} FLAKE-D: token-overlapping testid drift`, async ({ page }) => {
    await page.goto('/')
    // Failing testid value "in-stock-badge" — DOM has "availability-badge"
    // with name "In Stock". Shared token "stock" triggers the classifier's
    // tokensOverlap match. Tight timeout keeps the error message in the
    // "TimeoutError waiting for..." family so Oracle classifies FLAKY.
    await expect(page.getByTestId('in-stock-badge'))
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

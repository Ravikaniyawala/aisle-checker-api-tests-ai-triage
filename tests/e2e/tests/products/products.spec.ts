import { test, expect } from '../../src/fixtures/base'
import { testTags } from '../../src/helpers/testTags'
import {
  products,
  inStockProduct,
  outOfStockProduct,
  lowStockProduct,
} from '../../src/test-data/products'

test.describe('Products page', () => {

  test(`${testTags.SMOKE} ${testTags.PRODUCTS} PROD-001: products page loads and displays all products`, async ({
    productsPage,
  }) => {
    await productsPage.goto()
    await productsPage.expectLoaded()
    // EXPERIMENT PATTERN #5: count mismatch (value-mismatch family,
    // distinct shape from text mismatch). Asserts a wildly wrong
    // expected count so the failure renders as
    //   Expected: <large>  Received: <actual>
    // Should trigger Oracle's value_mismatch HARD GUARD downstream
    // and be classified as REGRESSION.
    await productsPage.expectProductCount(products.length + 99)
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
    // EXPERIMENT: deliberate locator drift — the DOM has data-test="availability-badge",
    // this assertion uses data-test="availability-badge-v2" (mimics a half-finished
    // test-ID rename). Should produce locator_drift_data_testid_only with high
    // confidence from Oracle's autofix detector. The other two assertion sites
    // (PROD-004, PROD-005) intentionally left as-is so only PROD-003 fails —
    // proves the detector localizes the drift to the right line.
    await expect(card.getByTestId('availability-badge-v2')).toHaveText('In Stock')
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
    // EXPERIMENT PATTERN #2: engineered timeout (1ms). Locator exists,
    // text matches, but the assertion's polling window is too short to
    // actually verify. Produces the classic "TimeoutError: locator
    // expected to be visible" shape that flaky timing patterns share.
    // Goal: see whether Oracle's triage classifies a tight-timeout
    // failure as FLAKY (the only category that survives Gate 1 to
    // reach the autofix routing matrix).
    await expect(card.getByTestId('availability-badge')).toHaveText('Low Stock', { timeout: 1 })
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

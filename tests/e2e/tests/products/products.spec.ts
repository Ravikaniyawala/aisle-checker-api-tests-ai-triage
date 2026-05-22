import { test, expect } from '../../src/fixtures/base'
import { testTags } from '../../src/helpers/testTags'
import {
  products,
  inStockProduct,
  outOfStockProduct,
  lowStockProduct,
} from '../../src/test-data/products'

test.describe('Products page', () => {

  // PERMANENT-FLAKE DEMO — deliberately failing test landed on main to
  // demonstrate the Phase 1 TestHealer sticky-comment flow.
  //
  // Why this test exists: subsequent PRs that touch docs / config /
  // build files (i.e. NOT tests/** and NOT apps/*/src/**) will see
  // this test fail in their CI run. Oracle classifies the
  // `TimeoutError waiting for getByTestId('in-stock-badge')`
  // failure as FLAKY, the locator-drift classifier produces
  // `locator_drift_data_testid_only @ 0.90` (`in-stock-badge`
  // shares the "stock" token with the DOM's `availability-badge`),
  // Gate 3 + Gate 5 both pass (the PR doesn't touch tests or
  // product source), and the autofix queue entry lands `approved`.
  // The TestHealer reusable workflow then asks Claude for a
  // proposed diff and posts a sticky comment on the PR.
  //
  // Once the sticky comment is demonstrated to operators, this test
  // should be reverted (PR C in the demo plan) so green CI runs
  // don't carry a chronic failure.
  test(`${testTags.SMOKE} ${testTags.PRODUCTS} FLAKE-DEMO: token-overlapping testid drift`, async ({ page }) => {
    await page.goto('/')
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

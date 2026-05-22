import { test, expect } from '../../src/fixtures/base'
import { testTags } from '../../src/helpers/testTags'
import {
  products,
  inStockProduct,
  outOfStockProduct,
  lowStockProduct,
} from '../../src/test-data/products'

test.describe('Products page', () => {

  // END-TO-END VERIFICATION ONLY — do NOT merge. Brand-new branch off
  // main with NO prior cache, so GitHub Actions cache restore falls
  // through to main's cache (populated by PR #13's merge run, now
  // that all three gap fixes — Oracle PR #51/#52/#53 — are on main).
  //
  // Expected this time:
  //   [oracle] autofix mode=auto topology=monorepo_e2e/full allowsAuto=true
  //   decision=approved
  //   driftKind=locator_drift_data_testid_only
  //   driftConfidence=0.90
  test(`${testTags.SMOKE} ${testTags.PRODUCTS} VERIFY-E2E: flake-shaped`, async ({ page }) => {
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

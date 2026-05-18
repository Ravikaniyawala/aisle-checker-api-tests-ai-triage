import { test, expect } from '../../src/fixtures/base'
import { testTags } from '../../src/helpers/testTags'
import { inStockProduct, outOfStockProduct, lowStockProduct } from '../../src/test-data/products'

test.describe('Product detail page', () => {

  test(`${testTags.SMOKE} ${testTags.PRODUCT_DETAIL} DETAIL-001: product detail page shows correct information`, async ({
    productDetailPage,
  }) => {
    await productDetailPage.goto(inStockProduct.id)
    await productDetailPage.expectLoaded()
    await productDetailPage.expectProductName(inStockProduct.name)
    await productDetailPage.expectProductPrice(inStockProduct.price)
    await productDetailPage.expectProductAisle(inStockProduct.aisle)
  })

  test(`${testTags.REGRESSION} ${testTags.PRODUCT_DETAIL} DETAIL-002: detail page shows availability from API for in-stock product`, async ({
    productDetailPage,
  }) => {
    await productDetailPage.goto(inStockProduct.id)
    await productDetailPage.expectLoaded()
    await productDetailPage.expectAvailabilityStatus('in_stock')
    await expect(productDetailPage.availabilityBadge).toHaveText('In Stock')
  })

  test(`${testTags.REGRESSION} ${testTags.PRODUCT_DETAIL} DETAIL-003: detail page shows availability from API for out-of-stock product`, async ({
    productDetailPage,
  }) => {
    await productDetailPage.goto(outOfStockProduct.id)
    await productDetailPage.expectLoaded()
    await productDetailPage.expectAvailabilityStatus('out_of_stock')
    await expect(productDetailPage.availabilityBadge).toHaveText('Out of Stock')
  })

  test(`${testTags.REGRESSION} ${testTags.PRODUCT_DETAIL} DETAIL-004: detail page shows availability from API for low-stock product`, async ({
    productDetailPage,
  }) => {
    await productDetailPage.goto(lowStockProduct.id)
    await productDetailPage.expectLoaded()
    await productDetailPage.expectAvailabilityStatus('low_stock')
    await expect(productDetailPage.availabilityBadge).toHaveText('Low Stock')
  })

  test(`${testTags.REGRESSION} ${testTags.PRODUCT_DETAIL} DETAIL-005: back link navigates to products page`, async ({
    productDetailPage,
    page,
  }) => {
    await productDetailPage.goto(inStockProduct.id)
    await productDetailPage.expectLoaded()
    await productDetailPage.goBackToProducts()
    await expect(page.getByTestId('products-page')).toBeVisible()
  })

})

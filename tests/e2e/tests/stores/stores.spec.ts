import { test, expect } from '../../src/fixtures/base'
import { testTags } from '../../src/helpers/testTags'
import { stores, northStoreProducts, southStoreProducts } from '../../src/test-data/products'

test.describe('Stores page', () => {

  test(`${testTags.SMOKE} ${testTags.STORES} STORE-001: stores page loads and shows all store locations`, async ({
    storesPage,
  }) => {
    await storesPage.goto()
    await storesPage.expectLoaded()
    await storesPage.expectStoreCount(stores.length)
    for (const store of stores) {
      await storesPage.expectStoreVisible(store.name)
    }
  })

  test(`${testTags.REGRESSION} ${testTags.STORES} STORE-002: selecting North Store shows its products`, async ({
    storesPage,
  }) => {
    await storesPage.goto()
    await storesPage.expectLoaded()
    await storesPage.selectStore('North Store')
    await storesPage.expectStoreProductsVisible()
    await storesPage.expectStoreProductCount(northStoreProducts.length)

    for (const product of northStoreProducts) {
      await storesPage.expectStoreProductVisible(product.name)
    }
  })

  test(`${testTags.REGRESSION} ${testTags.STORES} STORE-003: selecting South Store shows its products`, async ({
    storesPage,
  }) => {
    await storesPage.goto()
    await storesPage.expectLoaded()
    await storesPage.selectStore('South Store')
    await storesPage.expectStoreProductsVisible()
    await storesPage.expectStoreProductCount(southStoreProducts.length)

    for (const product of southStoreProducts) {
      await storesPage.expectStoreProductVisible(product.name)
    }
  })

  test(`${testTags.REGRESSION} ${testTags.STORES} STORE-004: North Store does not contain South-only products`, async ({
    storesPage,
  }) => {
    await storesPage.goto()
    await storesPage.expectLoaded()
    await storesPage.selectStore('North Store')
    await storesPage.expectStoreProductsVisible()

    // Organic Pasta and Orange Juice are South Store only — must not appear in North
    await storesPage.expectStoreProductNotVisible('Organic Pasta 500g')
    await storesPage.expectStoreProductNotVisible('Orange Juice 1L')
    await storesPage.expectStoreProductCount(northStoreProducts.length)
  })

  test(`${testTags.REGRESSION} ${testTags.STORES} STORE-005: navbar Stores link navigates from products page`, async ({
    productsPage,
    page,
  }) => {
    await productsPage.goto()
    await productsPage.expectLoaded()
    await productsPage.navStores.click()
    // EXPERIMENT PATTERN #3: strict-mode violation. `page.locator('div')`
    // matches many elements; calling `.toBeVisible()` on a strict-mode
    // locator that resolved to >1 element fails with:
    //   "strict mode violation: locator('div') resolved to N elements"
    // The autofix detector's classifier has a dedicated repairability
    // kind for this: `strict_mode_selector_ambiguity`, which is
    // AUTO-eligible. Triage classification is the wildcard — could go
    // FLAKY or NEW_BUG depending on Oracle's instinct context.
    await expect(page.locator('div')).toBeVisible()
  })

})

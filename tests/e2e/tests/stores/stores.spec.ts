import { test, expect } from '../../src/fixtures/base'
import { testTags } from '../../src/helpers/testTags'
import { stores, northStoreProducts, southStoreProducts, products } from '../../src/test-data/products'

// Derived once — never hardcode product name strings (AP-003 / typed-data rule)
const southOnlyProducts = products.filter(
  p => southStoreProducts.some(s => s.id === p.id) && !northStoreProducts.some(n => n.id === p.id)
)
const northOnlyProducts = products.filter(
  p => northStoreProducts.some(n => n.id === p.id) && !southStoreProducts.some(s => s.id === p.id)
)

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
    // AP-006: South-only products must not appear in North Store
    for (const p of southOnlyProducts) {
      await storesPage.expectStoreProductNotVisible(p.name)
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
    // AP-006: North-only products must not appear in South Store
    for (const p of northOnlyProducts) {
      await storesPage.expectStoreProductNotVisible(p.name)
    }
  })

  test(`${testTags.REGRESSION} ${testTags.STORES} STORE-004: North Store does not contain South-only products`, async ({
    storesPage,
  }) => {
    await storesPage.goto()
    await storesPage.expectLoaded()
    await storesPage.selectStore('North Store')
    await storesPage.expectStoreProductsVisible()

    // AP-006: count first, then named negatives derived from typed test data
    await storesPage.expectStoreProductCount(northStoreProducts.length)
    for (const p of southOnlyProducts) {
      await storesPage.expectStoreProductNotVisible(p.name)
    }
  })

  test(`${testTags.REGRESSION} ${testTags.STORES} STORE-005: navbar Stores link navigates from products page`, async ({
    productsPage,
    page,
  }) => {
    await productsPage.goto()
    await productsPage.expectLoaded()
    await productsPage.navStores.click()
    await expect(page.getByTestId('stores-page')).toBeVisible()
  })

})

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

export { expect } from '@playwright/test'

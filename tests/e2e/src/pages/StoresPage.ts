import { type Page, type Locator, expect } from '@playwright/test'

export class StoresPage {
  readonly page: Page
  readonly container: Locator
  readonly storeList: Locator
  readonly storeCards: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.getByTestId('stores-page')
    this.storeList = page.getByTestId('store-list')
    this.storeCards = page.getByTestId('store-card')
  }

  async goto() {
    await this.page.goto('/#/stores')
  }

  async expectLoaded() {
    await expect(this.storeList).toBeVisible()
  }

  async expectStoreCount(count: number) {
    await expect(this.storeCards).toHaveCount(count)
  }

  async expectStoreVisible(name: string) {
    await expect(this.storeCards.filter({ hasText: name })).toBeVisible()
  }

  async selectStore(name: string) {
    await this.storeCards.filter({ hasText: name }).click()
  }

  async expectStoreProductsVisible() {
    await expect(this.page.getByTestId('store-products-list')).toBeVisible()
  }

  async expectStoreProductCount(count: number) {
    await expect(this.page.getByTestId('store-product-card')).toHaveCount(count)
  }

  async expectStoreProductVisible(productName: string) {
    const list = this.page.getByTestId('store-products-list')
    await expect(list.getByTestId('product-name').filter({ hasText: productName })).toBeVisible()
  }

  async expectStoreProductNotVisible(productName: string) {
    const list = this.page.getByTestId('store-products-list')
    await expect(list.getByTestId('product-name').filter({ hasText: productName })).toHaveCount(0)
  }
}

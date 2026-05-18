import { type Page, type Locator, expect } from '@playwright/test'

export class ProductsPage {
  readonly page: Page
  readonly productList: Locator
  readonly productCards: Locator
  readonly navProducts: Locator
  readonly navStores: Locator

  constructor(page: Page) {
    this.page = page
    this.productList = page.getByTestId('product-list')
    this.productCards = page.getByTestId('product-card')
    this.navProducts = page.getByTestId('nav-products')
    this.navStores = page.getByTestId('nav-stores')
  }

  async goto() {
    await this.page.goto('/')
  }

  async expectLoaded() {
    await expect(this.productList).toBeVisible()
  }

  async expectProductCount(count: number) {
    await expect(this.productCards).toHaveCount(count)
  }

  async expectProductVisible(name: string) {
    await expect(this.productCards.filter({ hasText: name })).toBeVisible()
  }

  async clickProduct(name: string) {
    await this.productCards.filter({ hasText: name }).click()
  }

  async getCardByName(name: string): Promise<Locator> {
    return this.productCards.filter({ hasText: name })
  }

  async expectCardShowsPrice(productName: string, price: string) {
    const card = this.productCards.filter({ hasText: productName })
    await expect(card.getByTestId('product-price')).toHaveText(price)
  }

  async expectCardShowsAisle(productName: string, aisle: string) {
    const card = this.productCards.filter({ hasText: productName })
    await expect(card.getByTestId('product-aisle')).toHaveText(aisle)
  }

  async expectCardShowsAvailability(productName: string, status: string) {
    const card = this.productCards.filter({ hasText: productName })
    await expect(card.getByTestId('availability-badge')).toHaveAttribute('data-status', status)
  }
}

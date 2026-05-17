import { type Page, type Locator, expect } from '@playwright/test'

export class ProductDetailPage {
  readonly page: Page
  readonly container: Locator
  readonly productName: Locator
  readonly productPrice: Locator
  readonly productAisle: Locator
  readonly availabilityBadge: Locator
  readonly backLink: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.getByTestId('product-detail-page')
    this.productName = page.getByTestId('detail-product-name')
    this.productPrice = page.getByTestId('detail-product-price')
    this.productAisle = page.getByTestId('detail-product-aisle')
    this.availabilityBadge = page.getByTestId('availability-badge')
    this.backLink = page.getByTestId('back-link')
  }

  async goto(productId: number) {
    await this.page.goto(`/#/products/${productId}`)
  }

  async expectLoaded() {
    await expect(this.container).toBeVisible()
  }

  async expectProductName(name: string) {
    await expect(this.productName).toHaveText(name)
  }

  async expectProductPrice(price: string) {
    await expect(this.productPrice).toHaveText(price)
  }

  async expectProductAisle(aisle: string) {
    await expect(this.productAisle).toHaveText(aisle)
  }

  async expectAvailabilityStatus(status: string) {
    await expect(this.availabilityBadge).toHaveAttribute('data-status', status)
  }

  async goBackToProducts() {
    await this.backLink.click()
  }
}

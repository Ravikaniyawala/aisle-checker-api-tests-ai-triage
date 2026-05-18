/**
 * Real-shaped Playwright error messages used to validate the locator parser
 * and supply-chain coverage. Each entry pairs an error string with the
 * locator we expect the parser to extract.
 *
 * Shapes covered (≥50 cases) sampled from real Playwright output in
 * aisle-checker style usage:
 *   - getByTestId timeouts
 *   - getByRole / getByText / getByLabel / getByPlaceholder timeouts
 *   - locator() with CSS selectors
 *   - locator() with attribute selectors
 *   - assertion failures (toHaveText, toBeVisible, toHaveCount, etc.)
 *   - strict-mode violations
 *   - filter-chained locators
 *   - cases with no locator (should return null)
 */

export interface ErrorFixture {
  id:               string;
  errorMessage:     string;
  /** Expected parser output; null = parser should return null. */
  expectedKind:     string | null;
  expectedValue?:   string;
  notes?:           string;
}

export const ERROR_FIXTURES: ErrorFixture[] = [
  // ── getByTestId family ─────────────────────────────────────────────────
  {
    id: 'err-01-gettestid-timeout',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('product-list')`,
    expectedKind: 'getByTestId',
    expectedValue: 'product-list',
  },
  {
    id: 'err-02-gettestid-fill-timeout',
    errorMessage:
      `TimeoutError: locator.fill: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('search-input')`,
    expectedKind: 'getByTestId',
    expectedValue: 'search-input',
  },
  {
    id: 'err-03-gettestid-visible-assertion',
    errorMessage:
      `Error: expect(locator).toBeVisible() failed\n` +
      `Locator: getByTestId('checkout-btn')\n` +
      `Expected: visible\nReceived: hidden`,
    expectedKind: 'getByTestId',
    expectedValue: 'checkout-btn',
  },
  {
    id: 'err-04-gettestid-count-mismatch',
    errorMessage:
      `Error: expect(locator).toHaveCount(6) failed\n` +
      `Locator: getByTestId('product-card')\n` +
      `Expected: 6\nReceived: 5`,
    expectedKind: 'getByTestId',
    expectedValue: 'product-card',
  },
  {
    id: 'err-05-gettestid-aisle-checker-stores',
    errorMessage:
      `TimeoutError: locator.waitFor: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('stores-page')`,
    expectedKind: 'getByTestId',
    expectedValue: 'stores-page',
  },

  // ── getByRole family ───────────────────────────────────────────────────
  {
    id: 'err-06-getbyrole-button-name',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByRole('button', { name: 'Checkout' })`,
    expectedKind: 'getByRole',
    expectedValue: 'button:Checkout',
  },
  {
    id: 'err-07-getbyrole-link-name',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByRole('link', { name: 'Sign in' })`,
    expectedKind: 'getByRole',
    expectedValue: 'link:Sign in',
  },
  {
    id: 'err-08-getbyrole-heading',
    errorMessage:
      `Error: expect(locator).toBeVisible() failed\n` +
      `Locator: getByRole('heading', { name: 'Products' })`,
    expectedKind: 'getByRole',
    expectedValue: 'heading:Products',
  },
  {
    id: 'err-09-getbyrole-no-name',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByRole('button')`,
    expectedKind: 'getByRole',
    expectedValue: 'button',
  },
  {
    id: 'err-10-getbyrole-with-spaces',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByRole('button',  {  name: 'Save changes'  })`,
    expectedKind: 'getByRole',
    expectedValue: 'button:Save changes',
  },

  // ── getByText / getByLabel / getByPlaceholder ──────────────────────────
  {
    id: 'err-11-gettext-timeout',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByText('Sign in')`,
    expectedKind: 'getByText',
    expectedValue: 'Sign in',
  },
  {
    id: 'err-12-gettext-multiline',
    errorMessage:
      `Error: Locator getByText('Welcome to AisleChecker') not found`,
    expectedKind: 'getByText',
    expectedValue: 'Welcome to AisleChecker',
  },
  {
    id: 'err-13-getlabel',
    errorMessage:
      `TimeoutError: locator.fill: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByLabel('Email address')`,
    expectedKind: 'getByLabel',
    expectedValue: 'Email address',
  },
  {
    id: 'err-14-getplaceholder',
    errorMessage:
      `TimeoutError: locator.fill: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByPlaceholder('Search products')`,
    expectedKind: 'getByPlaceholder',
    expectedValue: 'Search products',
  },

  // ── locator() with attribute selectors (aisle-checker uses data-test) ──
  {
    id: 'err-15-attribute-data-test',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for locator('[data-test="checkout-button"]')`,
    expectedKind: 'attribute_selector',
    expectedValue: 'checkout-button',
  },
  {
    id: 'err-16-attribute-data-testid',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for locator('[data-testid="add-to-cart"]')`,
    expectedKind: 'attribute_selector',
    expectedValue: 'add-to-cart',
  },
  {
    id: 'err-17-attribute-data-qa',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for locator('[data-qa=login-btn]')`,
    expectedKind: 'attribute_selector',
    expectedValue: 'login-btn',
  },
  {
    id: 'err-18-attribute-mixed-case',
    errorMessage:
      `Error: Element [data-test="ProductCard"] is not visible`,
    expectedKind: 'attribute_selector',
    expectedValue: 'ProductCard',
  },

  // ── locator() with CSS selectors ───────────────────────────────────────
  {
    id: 'err-19-id-selector',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for locator('#submit-btn')`,
    expectedKind: 'css_selector',
    expectedValue: '#submit-btn',
  },
  {
    id: 'err-20-class-selector',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for locator('.product-card')`,
    expectedKind: 'css_selector',
    expectedValue: '.product-card',
  },
  {
    id: 'err-21-tag-attr-selector',
    errorMessage:
      `TimeoutError: locator.fill: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for locator('input[type=password]')`,
    expectedKind: 'css_selector',
    expectedValue: 'input[type=password]',
  },
  {
    id: 'err-22-descendant-class',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for locator('.nav .item.active')`,
    expectedKind: 'css_selector',
    expectedValue: '.nav .item.active',
  },
  {
    id: 'err-23-nth-child',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for locator('ul > li:nth-child(3)')`,
    expectedKind: 'css_selector',
    expectedValue: 'ul > li:nth-child(3)',
  },
  {
    id: 'err-24-pseudo-selector',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for locator('.card:first-child')`,
    expectedKind: 'css_selector',
    expectedValue: '.card:first-child',
  },

  // ── Strict-mode violations ─────────────────────────────────────────────
  {
    id: 'err-25-strict-mode',
    errorMessage:
      `Error: strict mode violation: getByRole('button', { name: 'Add' }) resolved to 2 elements:\n` +
      `  1) <button>Add to cart</button>\n` +
      `  2) <button>Add to wishlist</button>`,
    expectedKind: 'getByRole',
    expectedValue: 'button:Add',
  },
  {
    id: 'err-26-strict-mode-3-elements',
    errorMessage:
      `Error: strict mode violation: getByTestId('button') resolved to 3 elements`,
    expectedKind: 'getByTestId',
    expectedValue: 'button',
  },

  // ── Assertions ─────────────────────────────────────────────────────────
  {
    id: 'err-27-tohavetext-fail',
    errorMessage:
      `Error: expect(locator).toHaveText() failed\n` +
      `Locator: getByTestId('availability-badge')\n` +
      `Expected: "In Stock"\nReceived: "Available"`,
    expectedKind: 'getByTestId',
    expectedValue: 'availability-badge',
  },
  {
    id: 'err-28-tohaveurl-fail',
    errorMessage:
      `Error: expect(page).toHaveURL() failed\n` +
      `Expected pattern: /.*checkout/\nReceived URL: http://localhost:5173/`,
    expectedKind: null,
    notes: 'no locator in expect(page).toHaveURL — parser returns null',
  },
  {
    id: 'err-29-tohaveattribute',
    errorMessage:
      `Error: expect(locator).toHaveAttribute('data-status', 'in_stock') failed\n` +
      `Locator: getByTestId('availability-badge').first()`,
    expectedKind: 'getByTestId',
    expectedValue: 'availability-badge',
  },
  {
    id: 'err-30-tocontaintext',
    errorMessage:
      `Error: expect(locator).toContainText() failed\n` +
      `Locator: getByText('Total')`,
    expectedKind: 'getByText',
    expectedValue: 'Total',
  },

  // ── Aisle-checker-specific real shapes ─────────────────────────────────
  {
    id: 'err-31-product-list',
    errorMessage:
      `TimeoutError: locator.waitFor: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('product-list') to be visible`,
    expectedKind: 'getByTestId',
    expectedValue: 'product-list',
  },
  {
    id: 'err-32-product-card-filter',
    errorMessage:
      `Error: locator.click: Element is not visible\n` +
      `  Call log: - waiting for getByTestId('product-card').filter({ hasText: 'Full Cream Milk 2L' })`,
    expectedKind: 'getByTestId',
    expectedValue: 'product-card',
  },
  {
    id: 'err-33-detail-product-name',
    errorMessage:
      `Error: expect(locator).toHaveText() failed\n` +
      `Locator: getByTestId('detail-product-name')\n` +
      `Expected: "Full Cream Milk 2L"\nReceived: ""`,
    expectedKind: 'getByTestId',
    expectedValue: 'detail-product-name',
  },
  {
    id: 'err-34-store-card-click',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('store-card').filter({ hasText: 'North Store' })`,
    expectedKind: 'getByTestId',
    expectedValue: 'store-card',
  },
  {
    id: 'err-35-back-link',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('back-link')`,
    expectedKind: 'getByTestId',
    expectedValue: 'back-link',
  },

  // ── Edge cases ─────────────────────────────────────────────────────────
  {
    id: 'err-36-no-locator-just-message',
    errorMessage: `Error: expected true to be false`,
    expectedKind: null,
    notes: 'pure assertion failure, no locator',
  },
  {
    id: 'err-37-empty-message',
    errorMessage: ``,
    expectedKind: null,
  },
  {
    id: 'err-38-undefined-property',
    errorMessage:
      `TypeError: Cannot read properties of undefined (reading 'value')\n` +
      `  at ProductsPage.expectCardShowsPrice (src/pages/ProductsPage.ts:42:14)`,
    expectedKind: null,
    notes: 'product code TypeError; not a locator failure',
  },
  {
    id: 'err-39-double-quoted',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId("nav-products")`,
    expectedKind: 'getByTestId',
    expectedValue: 'nav-products',
  },
  {
    id: 'err-40-backtick-quoted',
    errorMessage:
      'TimeoutError: locator.click: Timeout 5000ms exceeded.\n' +
      'Call log:\n  - waiting for getByTestId(`stores-page`)',
    expectedKind: 'getByTestId',
    expectedValue: 'stores-page',
  },

  // ── More aisle-checker patterns ────────────────────────────────────────
  {
    id: 'err-41-product-price-toHaveText',
    errorMessage:
      `Error: expect(locator).toHaveText('$3.49') failed\n` +
      `Locator: getByTestId('product-price').first()\nExpected: "$3.49"\nReceived: "$3.59"`,
    expectedKind: 'getByTestId',
    expectedValue: 'product-price',
  },
  {
    id: 'err-42-product-aisle-toHaveText',
    errorMessage:
      `Error: expect(locator).toHaveText('A3') failed\n` +
      `Locator: getByTestId('product-aisle')`,
    expectedKind: 'getByTestId',
    expectedValue: 'product-aisle',
  },
  {
    id: 'err-43-store-products-list',
    errorMessage:
      `Error: expect(locator).toBeVisible() failed\n` +
      `Locator: getByTestId('store-products-list')`,
    expectedKind: 'getByTestId',
    expectedValue: 'store-products-list',
  },
  {
    id: 'err-44-stock-status-attr',
    errorMessage:
      `Error: expect(locator).toHaveAttribute('data-status', 'low_stock') failed\n` +
      `Locator: getByTestId('availability-badge')\nExpected: "low_stock"\nReceived: "in_stock"`,
    expectedKind: 'getByTestId',
    expectedValue: 'availability-badge',
  },
  {
    id: 'err-45-product-detail-page',
    errorMessage:
      `TimeoutError: locator.waitFor: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('product-detail-page')`,
    expectedKind: 'getByTestId',
    expectedValue: 'product-detail-page',
  },
  {
    id: 'err-46-nav-stores-link',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('nav-stores')`,
    expectedKind: 'getByTestId',
    expectedValue: 'nav-stores',
  },
  {
    id: 'err-47-data-test-bracket-spacing',
    errorMessage:
      `Error: locator not found: locator('[ data-test = "store-card" ]')`,
    expectedKind: 'attribute_selector',
    expectedValue: 'store-card',
  },
  {
    id: 'err-48-locator-chain-first',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('product-card').first()`,
    expectedKind: 'getByTestId',
    expectedValue: 'product-card',
  },
  {
    id: 'err-49-locator-chain-nth',
    errorMessage:
      `TimeoutError: locator.click: Timeout 5000ms exceeded.\n` +
      `Call log:\n  - waiting for getByTestId('store-card').nth(0)`,
    expectedKind: 'getByTestId',
    expectedValue: 'store-card',
  },
  {
    id: 'err-50-product-name-filter',
    errorMessage:
      `Error: expect(locator).toBeVisible() failed\n` +
      `Locator: getByTestId('product-name').filter({ hasText: 'Sourdough Bread' })`,
    expectedKind: 'getByTestId',
    expectedValue: 'product-name',
  },
];

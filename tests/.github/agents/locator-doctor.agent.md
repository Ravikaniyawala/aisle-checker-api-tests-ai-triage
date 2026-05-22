---
name: locator-doctor
description: Inspect the aisle-checker React SPA and recommend or update robust Playwright locators.
tools:
  - codebase
  - editFiles
  - runCommands
  - search
---

# Locator Doctor Agent

## Purpose

Use Playwright CLI to inspect the aisle-checker React SPA and recommend or update robust Playwright locators.

## Rules

- Use `npx playwright-cli` when live page inspection is required. In CI, use only explicit headless, non-interactive commands.
- Do not run Playwright CLI with `--headed`, `npm run test:headed`, or any headed browser workflow in CI.
- The app uses HashRouter — navigate with `playwright-cli goto http://localhost:5173/#/stores` etc.
- Prefer locators in this order:
  1. `getByRole`
  2. `getByLabel`
  3. `getByPlaceholder`
  4. `getByText`
  5. `getByTestId`
  6. Short CSS only when no better option exists
- Because `testIdAttribute` is configured as `data-test`, prefer `getByTestId('foo')` over `[data-test="foo"]` and over `locator('[data-test="foo"]')`.
- Avoid raw `data-test` CSS, XPath, `nth-child`, long CSS selectors, and class-only selectors.
- Check `.ai/page-object-registry.yml` before updating page objects.
- Update locators only in the correct page object.
- In page objects, keep stable page-specific locators as `readonly Locator` properties initialized in the constructor.
- Reuse page-object locator properties inside actions and page-level assertions instead of repeating inline locators.
- Keep dynamic or parameterized locators as small private helper methods.
- Do not change assertions unless explicitly asked.
- Explain why the locator is robust.

## CSS Or Id Selector Gate

Before suggesting a CSS or id selector for any element, the locator-doctor must inspect the live DOM (via Playwright CLI) and check for data-test, role, label, placeholder, and text alternatives in that order. CSS or id is only acceptable when none of those exist on the element. Document the inspection result in the response.

## Aisle-Checker Data-Test Lookup

When live inspection is not available, use this lookup table before falling back to CSS:

### Products page (`/#/` or `/#/products`)
- `products-page` — page container
- `product-list` — `<ul>` containing product cards
- `product-card` — each product card (also has `data-product-id` attribute)
- `product-name` — product name inside a card
- `product-price` — product price inside a card
- `product-aisle` — aisle label inside a card
- `availability-badge` — availability badge (also has `data-status` attribute: `in_stock`, `low_stock`, `out_of_stock`)

### Product detail page (`/#/products/:id`)
- `product-detail-page` — page container
- `detail-product-name` — product name heading
- `detail-product-price` — product price
- `detail-product-aisle` — aisle label
- `availability-badge` — availability badge (also has `data-status` attribute)
- `back-link` — link back to products page

### Stores page (`/#/stores`)
- `stores-page` — page container
- `store-list` — `<ul>` containing store cards
- `store-card` — each store card (also has `data-store-id` attribute)
- `store-name` — store name inside a card
- `store-products-section` — products section shown after selecting a store
- `store-products-list` — list of products for the selected store
- `store-product-card` — each product card in the store products list

### Navigation
- `nav-products` — navbar link to products page
- `nav-stores` — navbar link to stores page

## Availability Badge Note

The `availability-badge` element carries both text (`In Stock`, `Low Stock`, `Out of Stock`) and a `data-status` attribute (`in_stock`, `low_stock`, `out_of_stock`). Prefer asserting via `data-status` for stability:

```ts
await expect(badge).toHaveAttribute('data-status', 'in_stock')
```

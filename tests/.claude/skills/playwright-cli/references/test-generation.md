# Test Generation

Generate Playwright test code automatically as you interact with the browser.

## How It Works

Every action you perform with `playwright-cli` generates corresponding Playwright TypeScript code.
This code appears in the output and can be copied directly into your test files.

## Example Workflow

```bash
# Start a session
playwright-cli open https://example.com/login

# Take a snapshot to see elements
playwright-cli snapshot
# Output shows: e1 [textbox "Email"], e2 [textbox "Password"], e3 [button "Sign In"]

# Fill form fields - generates code automatically
playwright-cli fill e1 "user@example.com"
# Ran Playwright code:
# await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');

playwright-cli fill e2 "password123"
# Ran Playwright code:
# await page.getByRole('textbox', { name: 'Password' }).fill('password123');

playwright-cli click e3
# Ran Playwright code:
# await page.getByRole('button', { name: 'Sign In' }).click();
```

## Building a Test File

Collect the generated code into a Playwright test:

> **Repo rule:** In this repo, always import from `../../src/fixtures/base` instead of
> `@playwright/test` directly. The base fixture injects page objects and the Oracle
> Phase 0 reporter hook. The example below shows the generic Playwright pattern for
> reference; adapt it to the repo import before committing.

```typescript
// Generic Playwright pattern (external reference only):
// import { test, expect } from '@playwright/test';

// ✅ Correct import for this repo:
import { test, expect } from '../../src/fixtures/base';
import { testTags } from '../../src/helpers/testTags';

test(`${testTags.SMOKE} ${testTags.PRODUCTS} PROD-XXX: products page loads`, async ({ productsPage }) => {
  // Use page objects, not raw page.goto() in specs:
  await productsPage.goto();
  await productsPage.expectLoaded();
});
```

## Best Practices

### 1. Use Semantic Locators

The generated code uses role-based locators when possible, which are more resilient:

```typescript
// Generated (good - semantic)
await page.getByRole('button', { name: 'Submit' }).click();

// Avoid (fragile - CSS selectors)
await page.locator('#submit-btn').click();
```

### 2. Explore Before Recording

Take snapshots to understand the page structure before recording actions:

```bash
playwright-cli open https://example.com
playwright-cli snapshot
# Review the element structure
playwright-cli click e5
```

### 3. Add Assertions Manually

Generated code captures actions but not assertions. Add expectations in your test:

```typescript
// Generated action
await page.getByRole('button', { name: 'Submit' }).click();

// Manual assertion
await expect(page.getByText('Success')).toBeVisible();
```

# Copilot Instructions

This is a Playwright TypeScript E2E automation framework for the **aisle-checker** demo monorepo (React SPA + Spring Boot API).

The framework lives under `tests/e2e/`. All commands should be run from that directory unless otherwise noted.

Use `.ai/*.yml` files as the source of truth for framework conventions, page object ownership, test inventory, test data, and feature mapping.

Use `.github/agents/*.agent.md` for specialized workflows in VS Code:

- QA Test Planner
- Playwright Test Writer
- Locator Doctor
- Test Fixer
- Test Reviewer

Use `AGENTS.md` for general repository guidance.

Use Playwright CLI for browser inspection only when useful. It supports locator discovery and diagnosis — it does not replace normal Playwright TypeScript tests.

For CI planner-to-writer sequences, use `.ai/ci-agent-sequence.yml` and the artifact contract under `agent-artifacts/`. The planner writes a test plan artifact, then the writer reads that plan plus repo metadata and writes framework-style tests directly. Do not add a Playwright codegen step to the CI sequence. Playwright CLI may be used in CI only for explicit headless, non-interactive inspection; do not pass `--headed`, run `npm run test:headed`, or use headed browser workflows in CI.

## Key framework facts

- Target app: `http://localhost:5173` (dev) / `http://localhost:4173` (CI preview)
- The app uses HashRouter — routes are `/#/`, `/#/products/:id`, `/#/stores`
- `testIdAttribute` is set to `data-test` — use `getByTestId('foo')` not `[data-test="foo"]`
- Availability badge status is in the `data-status` attribute (`in_stock`, `low_stock`, `out_of_stock`)
- No authentication — aisle-checker has no login page
- Page objects: `ProductsPage`, `ProductDetailPage`, `StoresPage` under `tests/e2e/src/pages/`
- Test data: named constants in `tests/e2e/src/test-data/products.ts`

## Rules

- Do not hardcode product or store IDs — use named exports from `src/test-data/products.ts`.
- Prefer page objects and fixtures.
- Prefer robust locators (`getByRole`, `getByTestId`).
- In page objects, keep stable page-specific locators as `readonly Locator` properties initialized in the constructor.
- Reuse page-object locator properties inside actions and page-level assertions instead of repeating inline locators.
- Do not hardcode `waitForTimeout` sleeps.
- Assert availability via `data-status` attribute, not badge text, unless the test is specifically checking display text.

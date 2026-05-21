# Aisle Checker — Sample Monorepo

## Purpose
Demo monorepo integrating AI Oracle triage via GitHub Actions reusable workflow.
Deliberately contains 4 failing tests to exercise all Oracle triage categories.

## Deliberate failures and expected Oracle classifications
- AisleAvailabilityTest.checkAvailabilityWithDelayedResponse → FLAKY
- AisleAvailabilityTest.checkBulkAvailabilityEndpoint        → NEW_BUG
- ProductSearchTest.searchProductWithWrongPriceAssertion     → REGRESSION
- PriceValidationTest.validateGSTCalculation                 → REGRESSION

## Running locally
  # Terminal 1
  cd apps/aisle-api && mvn spring-boot:run

  # Terminal 2
  cd tests/api && mvn test -Dapi.base.url=http://localhost:8080

## Pipeline
  build → api-tests → oracle-triage → deploy OR deploy-blocked
  Deploy is blocked when Oracle finds REGRESSION or NEW_BUG.

## Required GitHub secrets (Settings → Secrets → Actions)
  ANTHROPIC_API_KEY     (required)
  ATLASSIAN_TOKEN       (optional)
  ATLASSIAN_BASE_URL    (optional)
  ATLASSIAN_PROJECT_KEY (optional)
  SLACK_WEBHOOK_URL     (optional)

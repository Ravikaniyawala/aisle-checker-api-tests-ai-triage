# Aisle Checker — API Tests + AI Triage

A sample monorepo demonstrating AI-powered test failure triage via GitHub Actions.
The pipeline builds a Spring Boot REST API, runs REST Assured tests, and feeds results to the [AI Oracle](https://github.com/Ravikaniyawala/ai-oracle-triage) reusable workflow for automatic classification and deploy gating.

## Repo structure

```
aisle-checker/
├── apps/
│   └── aisle-api/          # Spring Boot 3 REST API (port 8080)
└── tests/
    └── api/                # REST Assured test suite (12 tests)
```

## Pipeline

```
build → api-tests → oracle-triage → deploy (CLEAR) or deploy-blocked (BLOCKED)
```

The AI Oracle classifies each failing test into one of four categories:

| Category | Meaning | Blocks deploy? |
|---|---|---|
| REGRESSION | Previously passing test now fails | Yes |
| NEW_BUG | Missing/broken feature never worked | Yes |
| FLAKY | Non-deterministic / timing-dependent | No |
| ENV_ISSUE | Infrastructure / environment problem | No |

## Deliberate failures

This repo contains **4 intentional test failures** to exercise all Oracle triage categories:

| Test | Expected category |
|---|---|
| `AisleAvailabilityTest.checkAvailabilityWithDelayedResponse` | FLAKY |
| `AisleAvailabilityTest.checkBulkAvailabilityEndpoint` | NEW_BUG |
| `ProductSearchTest.searchProductWithWrongPriceAssertion` | REGRESSION |
| `PriceValidationTest.validateGSTCalculation` | REGRESSION |

## Running locally

```bash
# Terminal 1 — start the API
cd apps/aisle-api && mvn spring-boot:run

# Terminal 2 — run tests
cd tests/api && mvn test -Dapi.base.url=http://localhost:8080
```

## Required GitHub secrets

| Secret | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers the Oracle triage |
| `ATLASSIAN_TOKEN` | No | Oracle skips Jira if absent |
| `ATLASSIAN_BASE_URL` | No | e.g. `https://your-org.atlassian.net` |
| `ATLASSIAN_PROJECT_KEY` | No | e.g. `QA` |
| `SLACK_WEBHOOK_URL` | No | Oracle skips Slack if absent |

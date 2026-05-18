# Oracle Autofix — Phase 0 Findings

**Verdict:** PHASE 0 PASS — Phase 1 unblocked

Repo under test: `aisle-checker-api-tests-ai-triage`
Declared topology: `monorepo_e2e`
Topology state: `partial`
Topology allows auto: `false`

Generated: 2026-05-18T03:20:57.214Z

## Exit criteria

| ID | Criterion | Threshold | Observed | Verdict |
|---|---|---|---|---|
| EC1 | Topology validation passes (state ≠ failed) | state ∈ {full, partial} | state = partial | ✅ PASS |
| EC2 | Artifact supply chain works on ≥95% of 50-failure sample | ≥95% parser accuracy AND end-to-end coverage | parser accuracy = 100.0%, end-to-end = 100.0% | ✅ PASS |
| EC3 | Locator-drift classifier ≥85% per sub-kind accuracy | every sub-kind ≥ 85% | min per-kind = 100.0% (locator_drift_dom_structure) | ✅ PASS |
| EC4 | Defaults reconciled — patterns resolve against aisle-checker layout | PRODUCT_SOURCE_PATTERNS and allowedEditPaths each match ≥ 1 file | product=17, allowed=55 | ✅ PASS |

> EC1: partial is expected for first-time Phase 0 runs; will upgrade to full once historical PR context overlaps PRODUCT_SOURCE_PATTERNS

## P0.1 — Topology validation

- State: **partial**
- App-change visibility proven: false
- Resolved allowedEditPaths sample (20):
  - `tests/api/pom.xml`
  - `tests/api/src/test/java/com/aislechecker/api/AisleAvailabilityTest.java`
  - `tests/api/src/test/java/com/aislechecker/api/PriceValidationTest.java`
  - `tests/api/src/test/java/com/aislechecker/api/ProductSearchTest.java`
  - `tests/api/src/test/java/com/aislechecker/api/StoreLocationTest.java`
  - `tests/e2e/.ai/feature-map.yml`
  - `tests/e2e/.ai/page-object-registry.yml`
  - `tests/e2e/.ai/qa-agent-manifest.yml`
  - `tests/e2e/.ai/test-data-catalog.yml`
  - `tests/e2e/.ai/test-inventory.yml`
- Resolved PRODUCT_SOURCE_PATTERNS sample (17):
  - `apps/aisle-api/src/main/java/com/aislechecker/AisleApplication.java`
  - `apps/aisle-api/src/main/java/com/aislechecker/config/CorsConfig.java`
  - `apps/aisle-api/src/main/java/com/aislechecker/controller/AisleController.java`
  - `apps/aisle-api/src/main/java/com/aislechecker/model/AisleLocation.java`
  - `apps/aisle-api/src/main/java/com/aislechecker/model/Product.java`
  - `apps/aisle-api/src/main/java/com/aislechecker/service/AisleService.java`
  - `apps/aisle-ui/src/App.tsx`
  - `apps/aisle-ui/src/api/client.ts`
  - `apps/aisle-ui/src/components/AvailabilityBadge.tsx`
  - `apps/aisle-ui/src/components/NavBar.tsx`
- ⚠️ Warnings:
  - topology_app_change_visibility_unproven: no historical PR context overlapping with PRODUCT_SOURCE_PATTERNS yet. Will upgrade to full once a PR touches product source.

## P0.2 — Artifact supply chain

- Locator parser:
  - Fixtures: 50
  - Parsed correctly: 46
  - Expected null (parser correctly returned null): 4
  - Accuracy: 100.0%
- End-to-end coverage (every required field populated): 100.0%

## P0.3 — Locator-drift classifier accuracy

### Hand-crafted cases

| Sub-kind | Correct / Total | Accuracy |
|---|---|---|
| `locator_drift_data_testid_only` | 20 / 20 | 100.0% |
| `locator_drift_css_class_only` | 20 / 20 | 100.0% |
| `locator_drift_user_visible_text` | 20 / 20 | 100.0% |
| `locator_drift_dom_structure` | 20 / 20 | 100.0% |
| **OVERALL** | **80 / 80** | **100.0%** |

### Hand-crafted + synthetic (full)

| Sub-kind | Correct / Total | Accuracy |
|---|---|---|
| `locator_drift_data_testid_only` | 70 / 70 | 100.0% |
| `locator_drift_css_class_only` | 70 / 70 | 100.0% |
| `locator_drift_user_visible_text` | 70 / 70 | 100.0% |
| `locator_drift_dom_structure` | 70 / 70 | 100.0% |
| **OVERALL** | **280 / 280** | **100.0%** |

## P0.4 — Defaults reconciliation

- Files scanned: 84
- PRODUCT_SOURCE_PATTERNS resolves to: 17 files
- allowedEditPaths resolves to: 55 files
- Recommendations:
  - PRODUCT_SOURCE_PATTERNS resolves to 17 files
  - allowedEditPaths resolves to 55 files
  - aisle-checker uses apps/aisle-api/ for Java API — defaults include apps/*/src/** which covers Java sources too
  - aisle-checker UI lives at apps/aisle-ui/src/** — covered by apps/*/src/** include
  - aisle-checker has Java API tests at tests/api/ — already covered by tests/** allowedEditPaths
  - aisle-checker page objects live at tests/e2e/src/pages/ — covered by tests/** but NOT by page-objects/**; consider replacing page-objects/** with tests/**/pages/** OR keeping both
  - aisle-checker fixtures live at tests/e2e/src/fixtures/ — covered by tests/** but NOT by fixtures/**; same note as page objects
  - aisle-checker uses `testIdAttribute: data-test` in playwright.config.ts — ensure data-test is in DEFAULT_TEST_ATTRIBUTES for the locator-drift classifier (already present in Phase 0 defaults)

## Conclusion

All exit criteria met. Phase 1 implementation can proceed.

See the JSON reports alongside this file for full machine-readable detail.

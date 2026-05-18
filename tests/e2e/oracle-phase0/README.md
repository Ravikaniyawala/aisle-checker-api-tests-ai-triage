# Oracle Autofix — Phase 0 Validation

Validation tooling for the ai-oracle-triage autofix gating layer, executed
against aisle-checker. **Not production code.** This module exists to prove
the artifact supply chain works end-to-end before Phase 1 detector code
lands in Oracle.

See `/Users/ravikaniyawala/ai-oracle-triage/docs/autofix-design.md` for the
full design.

## Phase 0 exit criteria

This module's success is gated on four checks. Each is implemented here
with deterministic tests + an aggregated findings report.

1. **Topology validation PASSES for aisle-checker** — declared topology
   matches reality (PRODUCT_SOURCE_PATTERNS resolve, allowedEditPaths
   resolve, etc.).
2. **Artifact supply chain works end-to-end on ≥95% of a 50-failure sample**
   — Playwright reporter emits `prompt.md` with valid ARIA snapshot, error,
   test code, and locator across realistic failure shapes.
3. **Locator-drift classifier hits ≥85% per-sub-kind accuracy** on a test
   set of 20 hand-crafted + 50 realistic cases per sub-kind.
4. **Defaults reconciled** — PRODUCT_SOURCE_PATTERNS and allowedEditPaths
   from the design either match aisle-checker conventions or are updated
   in this module's recommendations.

## Layout

```
oracle-phase0/
├── README.md
├── package.json              # tsx + node:test runner
├── tsconfig.json
├── src/                      # The validation tools
│   ├── types.ts
│   ├── topology-validator.ts
│   ├── locator-parser.ts
│   ├── path-normalizer.ts
│   ├── provenance-checker.ts
│   └── locator-drift-classifier.ts
├── reporter/
│   └── prompt-reporter.ts    # Playwright reporter
├── fixtures/
│   ├── error-messages/       # Real-shaped Playwright errors for parser
│   ├── aria-snapshots/       # ARIA snapshot examples
│   └── drift-cases/          # Pre/post pairs per locator-drift sub-kind
├── tests/                    # node:test unit tests for every src file
├── scripts/
│   ├── validate-topology.ts
│   ├── eval-classifier.ts
│   └── reconcile-defaults.ts
└── reports/
    └── PHASE0_FINDINGS.md    # Generated PASS/FAIL report
```

## Running

```bash
cd tests/e2e/oracle-phase0
npm install
npm test                       # unit tests for all src + reporter
npm run validate:topology      # topology check against aisle-checker config
npm run eval:classifier        # classifier accuracy on the fixture set
npm run reconcile:defaults     # PRODUCT_SOURCE_PATTERNS vs reality
npm run phase0:report          # regenerate PHASE0_FINDINGS.md from the above
```

The `phase0:report` script aggregates outputs from the other three runs into
the findings report.

## What this is NOT

- Not Oracle production code. Lives here in aisle-checker because Phase 0's
  job is to prove the supply chain works on a real consumer before Phase 1
  detector code lands upstream in `ai-oracle-triage`.
- Not coupled to Oracle runtime. None of these files are imported by Oracle.
  Phase 1 will re-implement equivalents in `src/autofix-detector/` upstream.
- Not a live integration. The Playwright reporter is wired into
  `playwright.config.ts` so you can produce real `prompt.md` artifacts on
  a real failing run, but the validation suite uses fixture data so the
  exit criteria can be evaluated deterministically.

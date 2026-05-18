import { defineConfig, devices } from '@playwright/test'

// Opt-in: when ORACLE_PHASE0=1, attach the Oracle Phase 0 prompt reporter
// so each failure produces a `test-results/failure-context/<id>/prompt.md`
// + `data.json` for downstream Oracle autofix detector validation.
const oraclePhase0Reporters: Array<[string, Record<string, unknown>]> =
  process.env.ORACLE_PHASE0 === '1'
    ? [['./oracle-phase0/reporter/prompt-reporter.ts', {
        outputDir: 'test-results/failure-context',
        repoRoot:  process.cwd().replace(/\/tests\/e2e$/, ''),
      }]]
    : []

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'playwright-results/results.xml' }],
    ...oraclePhase0Reporters,
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    testIdAttribute: 'data-test',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

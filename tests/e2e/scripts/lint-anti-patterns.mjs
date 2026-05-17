#!/usr/bin/env node
// Enforces AP-001 through AP-006 from .ai/qa-agent-manifest.yml

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = new URL('..', import.meta.url).pathname
const SCAN_DIRS = ['src', 'tests']

const rules = [
  {
    id: 'AP-001',
    name: 'Hardcoded sleep',
    pattern: /waitForTimeout\s*\(/,
    message: 'Use expect(...).toBeVisible({ timeout: N }) or expect.poll() instead.',
  },
  {
    id: 'AP-002',
    name: 'Try-catch reload',
    pattern: /catch\s*[\w(){}]*\s*\{[^}]*page\.reload\s*\(/s,
    message: 'Use expect.poll() or increase assertion timeout instead.',
  },
  {
    id: 'AP-003',
    name: 'Raw CSS/ID selectors',
    pattern: /\.locator\s*\(\s*['"`][#.][^'"`]+['"`]\s*\)/,
    message: 'Use getByTestId(), getByRole(), or getByLabel() instead of CSS/ID selectors.',
  },
  {
    id: 'AP-006',
    name: 'Missing negative assertion after removal check',
    pattern: /expectStoreProductCount\s*\([^)]+\)(?![\s\S]*expectStoreProductNotVisible)/,
    files: /stores\.spec\.ts$/,
    message: 'After asserting item count, also assert identity + absence of removed items.',
    warnOnly: true,
  },
]

function collectFiles(dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...collectFiles(full))
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry) && !entry.includes('.config.')) {
      files.push(full)
    }
  }
  return files
}

let violations = 0
let warnings = 0

for (const scanDir of SCAN_DIRS) {
  const absDir = join(ROOT, scanDir)
  let files
  try {
    files = collectFiles(absDir)
  } catch {
    continue
  }

  for (const file of files) {
    const rel = relative(ROOT, file)
    const content = readFileSync(file, 'utf8')

    for (const rule of rules) {
      if (rule.files && !rule.files.test(file)) continue
      if (rule.pattern.test(content)) {
        const prefix = rule.warnOnly ? 'WARN' : 'FAIL'
        console.error(`[${prefix}] ${rel}: ${rule.id} ${rule.name} — ${rule.message}`)
        if (rule.warnOnly) {
          warnings++
        } else {
          violations++
        }
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} anti-pattern violation(s) found. Fix before committing.`)
  process.exit(1)
}

if (warnings > 0) {
  console.warn(`\n${warnings} warning(s). Review the flagged patterns above.`)
}

if (violations === 0 && warnings === 0) {
  console.log('No anti-pattern violations found.')
}

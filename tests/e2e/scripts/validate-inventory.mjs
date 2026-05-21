#!/usr/bin/env node
// Validates that every entry in .ai/test-inventory.yml:
//   1. Has a unique ID
//   2. Has a non-empty title and file path
//   3. References a spec file that actually exists on disk

import { readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'

const E2E_ROOT   = new URL('..', import.meta.url).pathname  // …/tests/e2e/
const TESTS_ROOT  = resolve(E2E_ROOT, '..')                  // …/tests/
const REPO_ROOT   = resolve(TESTS_ROOT, '..')                // …/aisle-checker-api-tests-ai-triage/
const INVENTORY   = join(TESTS_ROOT, '.ai/test-inventory.yml')

// ── Minimal YAML parser for the inventory format ───────────────────────────
// Parses the flat list of objects:
//   - id: "PROD-001"
//     title: "..."
//     file: "..."
//     ...
function parseInventory(src) {
  const tests = []
  let current = null

  for (const rawLine of src.split('\n')) {
    const line = rawLine.trimEnd()

    // New item entry
    if (/^\s*-\s+id:\s*"([^"]+)"/.test(line)) {
      if (current) tests.push(current)
      current = { id: line.match(/"([^"]+)"/)[1] }
      continue
    }

    if (!current) continue

    const titleMatch = line.match(/^\s+title:\s*"([^"]+)"/)
    if (titleMatch) { current.title = titleMatch[1]; continue }

    const fileMatch = line.match(/^\s+file:\s*"([^"]+)"/)
    if (fileMatch) { current.file = fileMatch[1]; continue }
  }

  if (current) tests.push(current)
  return tests
}

// ── Run validation ─────────────────────────────────────────────────────────
let src
try {
  src = readFileSync(INVENTORY, 'utf8')
} catch {
  console.error(`[FAIL] Cannot read inventory file: ${INVENTORY}`)
  process.exit(1)
}

const tests = parseInventory(src)
const seenIds = new Set()
let errors = 0

for (const t of tests) {
  const label = t.id ?? '(no id)'

  // Duplicate ID
  if (seenIds.has(t.id)) {
    console.error(`[FAIL] ${label}: duplicate test ID`)
    errors++
  } else {
    seenIds.add(t.id)
  }

  // Missing title
  if (!t.title) {
    console.error(`[FAIL] ${label}: missing 'title' field`)
    errors++
  }

  // Missing file
  if (!t.file) {
    console.error(`[FAIL] ${label}: missing 'file' field`)
    errors++
    continue
  }

  // File must exist relative to repo root
  const abs = join(REPO_ROOT, t.file)
  if (!existsSync(abs)) {
    console.error(`[FAIL] ${label}: spec file not found — ${t.file}`)
    errors++
  }
}

if (errors > 0) {
  console.error(`\n${errors} inventory validation error(s). Fix before committing.`)
  process.exit(1)
}

console.log(`Inventory valid — ${tests.length} test(s) checked.`)

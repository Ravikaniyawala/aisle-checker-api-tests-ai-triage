#!/usr/bin/env node
// Prepares the planner/writer artifact directory structure for the
// agentic-qa-sequence CI workflow.
//
// Reads from environment:
//   PLANNER_REQUEST      — full prompt text for the planner agent
//   WRITER_REQUEST       — full prompt text for the writer agent
//   PLAN_ARTIFACT_PATH   — path for planner output (default: agent-artifacts/plans/test-plan.md)
//   WRITER_SUMMARY_PATH  — path for writer output  (default: agent-artifacts/writer/change-summary.md)
//
// Creates:
//   agent-artifacts/requests/planner-request.md
//   agent-artifacts/requests/writer-request.md
//   agent-artifacts/plans/         (directory, with a .gitkeep placeholder)
//   agent-artifacts/writer/        (directory, with a .gitkeep placeholder)

import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'

const ROOT = new URL('..', import.meta.url).pathname

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function writePlaceholder(dir) {
  const keeper = join(dir, '.gitkeep')
  if (!existsSync(keeper)) writeFileSync(keeper, '')
}

function writeArtifact(relPath, content, description) {
  const abs = join(ROOT, relPath)
  ensureDir(dirname(abs))
  writeFileSync(abs, content ?? '')
  console.log(`[agent:ci:prepare] wrote ${description}: ${relPath}`)
}

const plannerRequest  = process.env.PLANNER_REQUEST  ?? ''
const writerRequest   = process.env.WRITER_REQUEST   ?? ''
const planPath        = process.env.PLAN_ARTIFACT_PATH   ?? 'agent-artifacts/plans/test-plan.md'
const writerSummPath  = process.env.WRITER_SUMMARY_PATH  ?? 'agent-artifacts/writer/change-summary.md'

if (!plannerRequest.trim()) {
  console.error('[agent:ci:prepare] PLANNER_REQUEST env var is empty or unset.')
  process.exit(1)
}
if (!writerRequest.trim()) {
  console.error('[agent:ci:prepare] WRITER_REQUEST env var is empty or unset.')
  process.exit(1)
}

writeArtifact('agent-artifacts/requests/planner-request.md', plannerRequest, 'planner request')
writeArtifact('agent-artifacts/requests/writer-request.md',  writerRequest,  'writer request')

// Ensure output directories exist so subsequent steps can write to them
const planDir   = dirname(join(ROOT, planPath))
const writerDir = dirname(join(ROOT, writerSummPath))
ensureDir(planDir);   writePlaceholder(planDir)
ensureDir(writerDir); writePlaceholder(writerDir)

console.log('[agent:ci:prepare] artifact directories ready.')
console.log(`  Planner output expected at: ${planPath}`)
console.log(`  Writer  output expected at: ${writerSummPath}`)

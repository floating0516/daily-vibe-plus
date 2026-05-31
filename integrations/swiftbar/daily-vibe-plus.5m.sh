#!/usr/bin/env bash

set -euo pipefail

REPORT_DIR="${DAILY_VIBE_REPORT_DIR:-$HOME/daily-vibe-reports}"
LATEST_JSON="$REPORT_DIR/latest.json"
DAILY_VIBE_BIN="${DAILY_VIBE_BIN:-daily-vibe}"

if [ ! -f "$LATEST_JSON" ]; then
  echo "Daily Vibe: no report"
  echo "---"
  echo "No latest report found"
  echo "Generate today | bash=$DAILY_VIBE_BIN param1=analyze param2=today param3=--out param4=$REPORT_DIR terminal=false refresh=true"
  echo "Open report folder | href=file://$REPORT_DIR"
  exit 0
fi

LATEST_JSON="$LATEST_JSON" REPORT_DIR="$REPORT_DIR" DAILY_VIBE_BIN="$DAILY_VIBE_BIN" node <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const latestJson = process.env.LATEST_JSON
const reportDir = process.env.REPORT_DIR
const dailyVibeBin = process.env.DAILY_VIBE_BIN

function truncate(value, max) {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max - 3)}...` : value
}

function menuLine(label, options = {}) {
  const attrs = Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${String(value).replace(/\|/g, '-')}`)
  console.log(attrs.length ? `${label} | ${attrs.join(' ')}` : label)
}

let data
try {
  data = JSON.parse(fs.readFileSync(latestJson, 'utf8'))
} catch (error) {
  console.log('Daily Vibe: invalid report')
  console.log('---')
  console.log(`Could not parse ${latestJson}`)
  console.log(String(error.message || error))
  process.exit(0)
}

const highlights = Array.isArray(data.highlights) ? data.highlights : []
const blockers = Array.isArray(data.blockers) ? data.blockers : []
const menuTitle = highlights.length > 0 ? `Today: ${highlights.length} items` : 'Daily Vibe: ready'

console.log(menuTitle)
console.log('---')
console.log('Daily Vibe Plus')
menuLine(`Date: ${data.date || 'unknown'}`)
menuLine(`Updated: ${data.updatedAt || 'unknown'}`)
console.log('---')
menuLine(truncate(data.summary || 'No summary available', 80))

if (highlights.length > 0) {
  console.log('---')
  console.log('Highlights')
  for (const item of highlights.slice(0, 8)) menuLine(truncate(`- ${item}`, 120))
}

if (blockers.length > 0) {
  console.log('---')
  console.log('Blockers')
  for (const item of blockers.slice(0, 5)) menuLine(truncate(`- ${item}`, 120))
}

console.log('---')
if (data.files?.latestMarkdown) menuLine('Open latest report', {href: `file://${data.files.latestMarkdown}`})
menuLine('Open report folder', {href: `file://${reportDir}`})
menuLine('Regenerate today', {bash: dailyVibeBin, param1: 'analyze', param2: 'today', param3: '--out', param4: reportDir, terminal: 'false', refresh: 'true'})

if (data.stats) {
  console.log('---')
  menuLine(`Sessions: ${data.stats.totalSessions ?? 0}`)
  menuLine(`Events: ${data.stats.totalEvents ?? 0}`)
  menuLine(`Problems: ${data.stats.totalProblems ?? 0}`)
}
NODE

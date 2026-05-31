import path from 'node:path'

import {writeFile} from '../utils/fs.js'
import {AnalysisResult, LatestReport} from '../utils/types.js'

export interface LatestReportFiles {
  daily?: string
  knowledge?: string
  latestMarkdown?: string
  rawData?: string
}

export function buildLatestMarkdown(result: AnalysisResult): string {
  return [
    '# Daily Vibe Plus Latest Report',
    '',
    `Date: ${result.date}`,
    `Updated At: ${new Date().toISOString()}`,
    '',
    '## Daily Report',
    '',
    result.dailyReport.trim(),
    '',
    '## Knowledge',
    '',
    result.knowledge.trim(),
    '',
  ].join('\n')
}

export function buildLatestReport(result: AnalysisResult, files: LatestReportFiles): LatestReport {
  const highlights = extractSectionItems(result.dailyReport, ['key outputs', '关键产出', 'highlights', '完成事项'])
  const blockers = extractSectionItems(result.dailyReport, ['blockers', 'risks', 'todo', '待办', '阻塞', '风险'])
  const summary = extractSummary(result.dailyReport) || `${result.stats.totalSessions} sessions, ${result.stats.totalEvents} events, ${result.stats.totalProblems} problems identified`

  return {
    blockers,
    date: result.date,
    files,
    highlights,
    stats: {
      chunks: result.stats.chunks,
      totalEvents: result.stats.totalEvents,
      totalProblems: result.stats.totalProblems,
      totalSessions: result.stats.totalSessions,
    },
    summary,
    title: 'Daily Vibe Plus Latest Report',
    updatedAt: new Date().toISOString(),
  }
}

export async function writeLatestReport(result: AnalysisResult, outputDir: string, files: LatestReportFiles): Promise<string[]> {
  const latestMarkdown = path.join(outputDir, 'latest.md')
  const latestJson = path.join(outputDir, 'latest.json')
  const latestFiles = {...files, latestMarkdown}

  await writeFile(latestMarkdown, buildLatestMarkdown(result))
  await writeFile(latestJson, JSON.stringify(buildLatestReport(result, latestFiles), null, 2))

  return [latestMarkdown, latestJson]
}

function cleanListItem(line: string): string {
  return line.replace(/^\s*[-*+]\s+/, '').replace(/^\s*\d+[.)]\s+/, '').replace(/^\s*\[[ xX]]\s+/, '').trim()
}

function extractSectionItems(markdown: string, headings: string[], limit = 5): string[] {
  const lines = markdown.split('\n')
  const items: string[] = []
  let inSection = false
  let sectionLevel = 0

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      const title = heading[2].toLowerCase()
      if (inSection && level <= sectionLevel) break
      if (headings.some((candidate) => title.includes(candidate.toLowerCase()))) {
        inSection = true
        sectionLevel = level
        continue
      }
    }

    if (!inSection) continue
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const item = cleanListItem(line)
      if (item) items.push(item)
      if (items.length >= limit) break
    }
  }

  return items
}

function extractSummary(markdown: string): string {
  const lines = markdown.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```') || /^[-*+]\s+/.test(trimmed)) continue
    return trimmed.length > 180 ? `${trimmed.slice(0, 177)}...` : trimmed
  }

  const firstItem = markdown.split('\n').map((line) => cleanListItem(line)).find((line) => line && !line.startsWith('#'))
  return firstItem || ''
}

import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {ensureDir, expandTilde, writeFile} from '../utils/fs.js'

export type WidgetTarget = 'all' | 'html' | 'ubersicht'

export interface WidgetExportOptions {
  force?: boolean
  htmlOutDir?: string
  reportDir?: string
  target: WidgetTarget
  ubersichtDir?: string
}

export interface WidgetExportResult {
  files: string[]
  instructions: string[]
}

const HTML_TEMPLATE = path.join('integrations', 'desktop-widget', 'dashboard', 'index.html')
const UBERSICHT_TEMPLATE = path.join('integrations', 'desktop-widget', 'ubersicht', 'daily-vibe-plus.jsx')
const UBERSICHT_WIDGET_NAME = 'daily-vibe-plus.jsx'
const WIDGET_PLACEHOLDER = '__REPORT_JSON_PATH__'

export async function exportWidget(options: WidgetExportOptions): Promise<WidgetExportResult> {
  const reportDir = resolvePath(options.reportDir || '~/daily-vibe-reports')
  const latestJson = path.join(reportDir, 'latest.json')
  const files: string[] = []

  if (options.target === 'html' || options.target === 'all') {
    const htmlOutDir = resolvePath(options.htmlOutDir || '~/daily-vibe-widget')
    const outputFile = path.join(htmlOutDir, 'index.html')
    await writeTemplate(HTML_TEMPLATE, outputFile, latestJson, options.force)
    files.push(outputFile)
  }

  if (options.target === 'ubersicht' || options.target === 'all') {
    const ubersichtDir = resolvePath(options.ubersichtDir || '~/Library/Application Support/Übersicht/widgets')
    const outputFile = path.join(ubersichtDir, UBERSICHT_WIDGET_NAME)
    await writeTemplate(UBERSICHT_TEMPLATE, outputFile, latestJson, options.force)
    files.push(outputFile)
  }

  return {
    files,
    instructions: [
      `Widget reads ${latestJson}`,
      `Generate or refresh the report with: daily-vibe analyze today --out ${reportDir}`,
      'The widget only reads latest.json. API errors only affect report generation, not the widget export.',
    ],
  }
}

async function readTemplate(relativePath: string): Promise<string> {
  const candidates = templateRoots().map(root => path.join(root, relativePath))
  const contents = await Promise.all(candidates.map(async (candidate) => {
    try {
      return await fs.promises.readFile(candidate, 'utf8')
    } catch {
      return ''
    }
  }))
  const template = contents.find(Boolean)
  if (template) return template

  throw new Error(`Could not find widget template: ${relativePath}`)
}

function resolvePath(value: string): string {
  return path.resolve(expandTilde(value))
}

function templateRoots(): string[] {
  const currentFile = fileURLToPath(import.meta.url)
  return [
    process.cwd(),
    path.resolve(path.dirname(currentFile), '..', '..'),
    path.resolve(path.dirname(currentFile), '..', '..', '..'),
  ]
}

async function writeTemplate(relativeTemplatePath: string, outputFile: string, latestJson: string, force?: boolean): Promise<void> {
  if (!force && fs.existsSync(outputFile)) throw new Error(`${outputFile} already exists. Use --force to overwrite it.`)

  const template = await readTemplate(relativeTemplatePath)
  const content = template.replaceAll(WIDGET_PLACEHOLDER, latestJson)
  await ensureDir(path.dirname(outputFile))
  await writeFile(outputFile, content)
}

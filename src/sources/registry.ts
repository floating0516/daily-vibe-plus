import os from 'node:os'
import path from 'node:path'

import {expandTilde, fileExists, findFiles} from '../utils/fs.js'
import {DataSource, SessionEvent, SessionSummary, SourceType} from '../utils/types.js'
import {collectClaudeCodeEvents} from './claude-code.js'
import {collectCodexEvents} from './codex.js'

export interface CollectOptions {
  dayEnd: Date
  dayStart: Date
  sources?: SourceType[]
}

export interface CollectResult {
  events: SessionEvent[]
  filesScanned: string[]
  sessions: SessionSummary[]
}

export const ALL_SOURCE_TYPES: SourceType[] = ['claude-code', 'specstory', 'codex-cli', 'codex-vscode']

export function normalizeSources(sources?: SourceType[]): SourceType[] {
  return sources?.length ? [...new Set(sources)] : ALL_SOURCE_TYPES
}

export async function collectRegisteredEvents(options: CollectOptions): Promise<CollectResult> {
  const sources = normalizeSources(options.sources)
  const collectors: Array<Promise<CollectResult>> = []
  if (sources.includes('claude-code') || sources.includes('specstory')) {
    collectors.push(collectClaudeCodeEvents({...options, includeSources: sources.filter((s) => s === 'claude-code' || s === 'specstory')}))
  }

  if (sources.includes('codex-cli') || sources.includes('codex-vscode')) {
    collectors.push(collectCodexEvents({...options, includeSources: sources.filter((s) => s === 'codex-cli' || s === 'codex-vscode')}))
  }

  const results = await Promise.all(collectors)
  return {
    events: results.flatMap((r) => r.events),
    filesScanned: results.flatMap((r) => r.filesScanned),
    sessions: results.flatMap((r) => r.sessions),
  }
}

export async function scanRegisteredSources(): Promise<DataSource[]> {
  return Promise.all([scanClaudeCodeProjects(), scanSpecStoryHistory(), scanCodexCli(), scanCodexVSCode()])
}

async function scanClaudeCodeProjects(): Promise<DataSource> {
  const basePath = expandTilde('~/.claude')
  const files = await fileExists(basePath) ? await findFiles(['projects/**/**/*.jsonl'], basePath) : []
  return {available: files.length > 0, description: 'Claude Code session files stored by project', filesFound: files.length, name: 'Claude Code', paths: [path.join(basePath, 'projects/**/**/*.jsonl')], type: 'claude-code'}
}

async function scanSpecStoryHistory(): Promise<DataSource> {
  const files = await findFiles(['**/.specstory/history/**/*.md', '**/.specstory/history/**/*.jsonl'])
  return {available: files.length > 0, description: 'SpecStory conversation history files', filesFound: files.length, name: 'SpecStory', paths: ['**/.specstory/history/**'], type: 'specstory'}
}

async function scanCodexCli(): Promise<DataSource> {
  const basePath = expandTilde('~/.codex')
  const sessions = await fileExists(basePath) ? await findFiles(['sessions/**/*.jsonl', 'history/**/*.jsonl'], basePath) : []
  return {available: sessions.length > 0, description: 'Codex CLI sessions and history', filesFound: sessions.length, name: 'Codex CLI', paths: [path.join(basePath, '{sessions,history}/**/*.jsonl')], type: 'codex-cli'}
}

async function scanCodexVSCode(): Promise<DataSource> {
  const platform = os.platform()
  const globalStoragePath = platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage') : platform === 'linux' ? path.join(os.homedir(), '.config', 'Code', 'User', 'globalStorage') : platform === 'win32' ? path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'globalStorage') : ''
  const files = globalStoragePath && await fileExists(globalStoragePath) ? await findFiles(['**/openai*codex*/**/*.jsonl', '**/openai*chatgpt*/**/*.jsonl', '**/codex*/**/*.jsonl'], globalStoragePath) : []
  return {available: files.length > 0, description: 'VS Code Codex extension storage', filesFound: files.length, name: 'Codex VS Code', paths: globalStoragePath ? [path.join(globalStoragePath, '**/*codex*/**/*.jsonl')] : [], type: 'codex-vscode'}
}

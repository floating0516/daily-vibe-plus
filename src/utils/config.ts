import {cosmiconfig} from 'cosmiconfig'
import os from 'node:os'
import path from 'node:path'

import {ensureDir, writeFile} from './fs.js'
import {AppConfig, LLMConfig} from './types.js'

const CONFIG_DIR = path.join(os.homedir(), '.daily-vibe')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

export const DEFAULT_REDACTION_PATTERNS = [
  String.raw`sk-[a-zA-Z0-9_-]{20,}`,
  String.raw`sk-proj-[a-zA-Z0-9_-]{20,}`,
  String.raw`sk-ant-[a-zA-Z0-9_-]{20,}`,
  String.raw`ghp_[a-zA-Z0-9]{20,}`,
  String.raw`gho_[a-zA-Z0-9]{20,}`,
  String.raw`ghu_[a-zA-Z0-9]{20,}`,
  String.raw`ghs_[a-zA-Z0-9]{20,}`,
  String.raw`ghr_[a-zA-Z0-9]{20,}`,
  String.raw`github_pat_[a-zA-Z0-9_]{20,}`,
  String.raw`npm_[a-zA-Z0-9_-]{20,}`,
  String.raw`xox[baprs]-[a-zA-Z0-9-]{20,}`,
  String.raw`glpat-[a-zA-Z0-9_-]{20,}`,
  String.raw`AKIA[0-9A-Z]{16}`,
  String.raw`ASIA[0-9A-Z]{16}`,
  String.raw`aws_secret_access_key\s*=\s*[^\s]+`,
  String.raw`(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s]+`,
  String.raw`Bearer\s+[a-zA-Z0-9._~+/=-]+`,
  String.raw`eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+`,
  String.raw`-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----`,
  String.raw`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`,
  String.raw`\b\d{3}-\d{2}-\d{4}\b`,
  String.raw`\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`,
]

const defaultConfig: AppConfig = {
  llm: {provider: 'openai'},
  output: {writeRawData: false},
  outputDir: 'reports',
  redact: {enabled: true, patterns: DEFAULT_REDACTION_PATTERNS},
  sources: {enabled: ['claude-code', 'specstory', 'codex-cli', 'codex-vscode']},
  timezone: 'Asia/Taipei',
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const fs = await import('node:fs')
    const configContent = await fs.promises.readFile(CONFIG_FILE, 'utf8')
    return mergeWithDefaults(JSON.parse(configContent))
  } catch {}

  const explorer = cosmiconfig('daily-vibe')
  try {
    const result = await explorer.search()
    if (result?.config) return mergeWithDefaults(result.config)
  } catch {}

  return defaultConfig
}

export async function saveConfig(config: Partial<AppConfig>, options: {merge?: boolean} = {}): Promise<void> {
  const base = options.merge === false ? defaultConfig : await loadConfig()
  const updatedConfig = mergeWithDefaults({
    ...base,
    ...config,
    llm: {...base.llm, ...config.llm},
    output: {writeRawData: config.output?.writeRawData ?? base.output?.writeRawData ?? false},
    redact: {enabled: config.redact?.enabled ?? base.redact?.enabled ?? true, patterns: config.redact?.patterns ?? base.redact?.patterns ?? DEFAULT_REDACTION_PATTERNS},
    sources: {enabled: config.sources?.enabled ?? base.sources?.enabled ?? defaultConfig.sources!.enabled},
  })
  await ensureDir(CONFIG_DIR)
  await writeFile(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2))
}

export async function updateLLMConfig(llmConfig: Partial<LLMConfig>): Promise<void> {
  const currentConfig = await loadConfig()
  await saveConfig({...currentConfig, llm: {...currentConfig.llm, ...llmConfig}})
}

function mergeWithDefaults(config: Partial<AppConfig>): AppConfig {
  return {
    llm: {...defaultConfig.llm, ...config.llm},
    output: {
      writeRawData: config.output?.writeRawData ?? defaultConfig.output!.writeRawData,
    },
    outputDir: config.outputDir || defaultConfig.outputDir,
    redact: {
      enabled: config.redact?.enabled ?? defaultConfig.redact!.enabled,
      patterns: config.redact?.patterns?.length ? config.redact.patterns : defaultConfig.redact!.patterns,
    },
    sources: {
      enabled: config.sources?.enabled?.length ? [...new Set(config.sources.enabled)] : defaultConfig.sources!.enabled,
    },
    timezone: config.timezone || defaultConfig.timezone,
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE
}

export function maskSecret(value?: string): string {
  if (!value) return '(not set)'
  if (value.length <= 8) return '***'
  return `${value.slice(0, 4)}***${value.slice(-4)}`
}

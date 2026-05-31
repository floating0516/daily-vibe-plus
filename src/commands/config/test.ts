import {Command, Flags} from '@oclif/core'
import chalk from 'chalk'

import {createLLMClient, resolveLLMConfig} from '../../core/llm.js'
import {RedactionEngine} from '../../core/redact.js'
import {scanRegisteredSources} from '../../sources/registry.js'
import {loadConfig, maskSecret} from '../../utils/config.js'
import {DataSource} from '../../utils/types.js'

export interface ConfigCheck {
  detail?: string
  name: string
  status: 'fail' | 'ok' | 'skipped'
}

export interface ConfigTestReport {
  checks: ConfigCheck[]
  sources: DataSource[]
}

export async function buildConfigTestReport(options: {scanSources?: () => Promise<DataSource[]>; skipLlm?: boolean; smokeTest?: () => Promise<void>} = {}): Promise<ConfigTestReport> {
  const checks: ConfigCheck[] = []
  let config
  try {
    config = await loadConfig()
    checks.push({name: 'config load', status: 'ok'})
  } catch (error) {
    checks.push({detail: String(error), name: 'config load', status: 'fail'})
    throw error
  }

  const resolved = resolveLLMConfig(config.llm)
  checks.push({detail: `provider=${resolved.provider}, model=${resolved.model}, baseUrl=${resolved.baseUrl || '(default)'}, key=${maskSecret(resolved.apiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)}`, name: 'llm config', status: 'ok'})

  try {
    const redactionEngine = new RedactionEngine(config.redact)
    if (!redactionEngine) throw new Error('Unable to create redaction engine')
    for (const pattern of config.redact?.patterns || []) {
      const regex = new RegExp(pattern, 'gi')
      if (!regex) throw new Error(`Invalid redaction regex: ${pattern}`)
    }

    checks.push({detail: `${config.redact?.patterns.length || 0} patterns`, name: 'redaction regex', status: 'ok'})
  } catch (error) {
    checks.push({detail: String(error), name: 'redaction regex', status: 'fail'})
  }

  const sources = await (options.scanSources || scanRegisteredSources)()
  checks.push({detail: `${sources.filter((source) => source.available).length}/${sources.length} available`, name: 'source availability', status: sources.some((source) => source.available) ? 'ok' : 'skipped'})

  if (options.skipLlm) {
    checks.push({detail: '--skip-llm set', name: 'llm smoke test', status: 'skipped'})
  } else {
    try {
      await (options.smokeTest ? options.smokeTest() : createLLMClient(config.llm).summarizeDaily('Smoke test. Reply briefly.', new Date().toISOString().slice(0, 10)));
      checks.push({name: 'llm smoke test', status: 'ok'})
    } catch (error) {
      checks.push({detail: error instanceof Error ? error.message : String(error), name: 'llm smoke test', status: 'fail'})
    }
  }

  return {checks, sources}
}

export default class ConfigTest extends Command {
  static override description = 'Validate configuration, redaction, sources, and optional LLM connectivity'
  static override flags = {
    json: Flags.boolean({char: 'j', description: 'Output pure JSON'}),
    'skip-llm': Flags.boolean({description: 'Skip network LLM smoke test'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(ConfigTest)
    const report = await buildConfigTestReport({skipLlm: flags['skip-llm']})
    if (flags.json) {
      this.log(JSON.stringify(report, null, 2))
      return
    }

    this.log(chalk.cyan('Configuration test results:\n'))
    for (const check of report.checks) {
      const marker = check.status === 'ok' ? chalk.green('✓') : check.status === 'skipped' ? chalk.yellow('-') : chalk.red('✗')
      this.log(`${marker} ${check.name}${check.detail ? chalk.dim(` — ${check.detail}`) : ''}`)
    }

    if (report.checks.some((check) => check.status === 'fail')) this.exit(1)
  }
}

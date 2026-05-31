import {Command} from '@oclif/core'
import chalk from 'chalk'
import fs from 'node:fs'
import readline from 'node:readline'

import {getConfigPath, loadConfig, maskSecret, saveConfig} from '../utils/config.js'
import {AppConfig, SourceType} from '../utils/types.js'

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

export default class Init extends Command {
  static override description = 'Interactively create or update Daily Vibe configuration'

  // eslint-disable-next-line complexity
  async run(): Promise<void> {
    const configPath = getConfigPath()
    const exists = fs.existsSync(configPath)
    const current = await loadConfig()
    const rl = readline.createInterface({input: process.stdin, output: process.stdout})

    try {
      let merge = true
      if (exists) {
        const mode = (await ask(rl, `Existing config found at ${configPath}. Merge or overwrite? [merge/overwrite] `)).trim().toLowerCase()
        merge = mode !== 'overwrite'
      }

      const provider = (await ask(rl, `LLM provider [${current.llm.provider}]: `)).trim() || current.llm.provider
      const model = (await ask(rl, `Model [${current.llm.model || ''}]: `)).trim() || current.llm.model
      const baseUrl = (await ask(rl, `Base URL [${current.llm.baseUrl || ''}]: `)).trim() || current.llm.baseUrl
      const apiKey = (await ask(rl, `API key [${current.llm.apiKey ? 'keep existing' : 'env/default'}]: `)).trim() || current.llm.apiKey
      const outputDir = (await ask(rl, `Output directory [${current.outputDir || 'reports'}]: `)).trim() || current.outputDir
      const timezone = (await ask(rl, `Timezone [${current.timezone || 'Asia/Taipei'}]: `)).trim() || current.timezone
      const sourcesInput = (await ask(rl, `Enabled sources, comma-separated [${current.sources?.enabled.join(',') || 'claude-code,specstory,codex-cli,codex-vscode'}]: `)).trim()
      const rawDataAnswer = (await ask(rl, `Write raw data.json by default? [y/N]: `)).trim().toLowerCase()
      const redactionAnswer = (await ask(rl, `Enable redaction? [Y/n]: `)).trim().toLowerCase()

      const enabledSources = sourcesInput ? sourcesInput.split(',').map((source) => source.trim()).filter(Boolean) as SourceType[] : current.sources?.enabled
      const nextConfig: Partial<AppConfig> = {
        llm: {apiKey, baseUrl, model, provider: provider as AppConfig['llm']['provider']},
        output: {writeRawData: rawDataAnswer === 'y' || rawDataAnswer === 'yes'},
        outputDir,
        redact: {...current.redact!, enabled: redactionAnswer !== 'n' && redactionAnswer !== 'no'},
        sources: {enabled: enabledSources || current.sources?.enabled || ['claude-code', 'specstory', 'codex-cli', 'codex-vscode']},
        timezone,
      }

      this.log(chalk.cyan('\nConfiguration summary:'))
      this.log(`  provider: ${nextConfig.llm?.provider}`)
      this.log(`  model: ${nextConfig.llm?.model || '(default)'}`)
      this.log(`  baseUrl: ${nextConfig.llm?.baseUrl || '(default)'}`)
      this.log(`  apiKey: ${maskSecret(nextConfig.llm?.apiKey)}`)
      this.log(`  outputDir: ${nextConfig.outputDir}`)
      this.log(`  timezone: ${nextConfig.timezone}`)
      this.log(`  sources: ${nextConfig.sources?.enabled.join(', ')}`)
      this.log(`  writeRawData: ${nextConfig.output?.writeRawData ? 'yes' : 'no'}`)
      this.log(`  redaction: ${nextConfig.redact?.enabled ? 'enabled' : 'disabled'}`)

      const confirm = (await ask(rl, '\nSave this configuration? [Y/n]: ')).trim().toLowerCase()
      if (confirm === 'n' || confirm === 'no') {
        this.log('Cancelled.')
        return
      }

      await saveConfig(nextConfig, {merge})
      this.log(chalk.green(`Saved config to ${configPath}`))
      this.log(chalk.dim('Next: run daily-vibe config test --skip-llm'))
    } finally {
      rl.close()
    }
  }
}

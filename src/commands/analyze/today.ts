import {Command, Flags} from '@oclif/core'
import chalk from 'chalk'

import {AnalysisPipeline, AnalyzeOptions} from '../../core/pipeline.js'
import {formatDate} from '../../utils/time.js'
import {AnalysisResult, SourceType} from '../../utils/types.js'

export default class AnalyzeToday extends Command {
  static override description = "Analyze today's coding sessions and generate daily report"
static override examples = ['<%= config.bin %> <%= command.id %> --out ./reports', '<%= config.bin %> <%= command.id %> --dry-run --preview', '<%= config.bin %> <%= command.id %> --provider openai --model gpt-4o --base-url http://localhost:1234/v1']
static override flags = {
    'base-url': Flags.string({description: 'LLM API base URL override'}),
    'dry-run': Flags.boolean({description: 'Scan, filter, redact, and estimate chunks without LLM calls or report writes'}),
    'exclude-project': Flags.string({description: 'Exclude project (repeatable)', multiple: true}),
    json: Flags.boolean({char: 'j', description: 'Output results as JSON'}),
    'min-events': Flags.integer({description: 'Only include sessions with at least this many events'}),
    model: Flags.string({char: 'm', description: 'Model name override'}),
    'no-latest': Flags.boolean({description: 'Do not write latest.md and latest.json when using --out'}),
    'no-progress': Flags.boolean({description: 'Disable progress output'}),
    'no-redact': Flags.boolean({description: 'Disable content redaction'}),
    out: Flags.string({char: 'o', description: 'Output directory for reports'}),
    preview: Flags.boolean({description: 'Show session preview'}),
    project: Flags.string({description: 'Only include project (repeatable)', multiple: true}),
    provider: Flags.string({char: 'p', description: 'LLM provider override', options: ['openai', 'anthropic', 'generic']}),
    'raw-data': Flags.boolean({description: 'Write data.json when used with --out'}),
    source: Flags.string({description: 'Source type to include (repeatable)', multiple: true, options: ['claude-code', 'specstory', 'codex-cli', 'codex-vscode']}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(AnalyzeToday)
    
    const today = new Date()
    const label = formatDate(today)
    const dayCount = undefined

    const options: AnalyzeOptions = {
      baseUrl: flags['base-url'],
      dryRun: flags['dry-run'],
      enableRedaction: !flags['no-redact'],
      excludeProjects: flags['exclude-project'],
      latest: !flags['no-latest'],
      minEvents: flags['min-events'],
      model: flags.model,
      outputDir: flags['dry-run'] ? undefined : flags.out,
      preview: flags.preview,
      progress: flags.json || flags['no-progress'] ? undefined : (message: string) => this.log(chalk.dim(`→ ${message}`)),
      projects: flags.project,
      provider: flags.provider as AnalyzeOptions['provider'],
      rawData: flags['raw-data'],
      sources: flags.source as SourceType[] | undefined,
    }

    if (!flags.json) this.log(chalk.cyan(`${flags['dry-run'] ? 'Dry-running' : 'Analyzing'} coding sessions for ${label}${dayCount ? ` (${dayCount} days)` : ''}\n`))

    try {
      const pipeline = await AnalysisPipeline.create()
      const result = await pipeline.analyzeDay(today, options)
      if (flags.json) {
        this.log(JSON.stringify(result, null, 2))
      } else {
        this.displayResults(result, flags.out, flags['dry-run'])
      }
    } catch (error) {
      this.error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private displayResults(result: AnalysisResult, outputDir?: string, dryRun?: boolean): void {
    this.log(chalk.bold.cyan('\nAnalysis Summary'))
    this.log(`Date: ${chalk.yellow(result.date)}`)
    this.log(`Sessions: ${chalk.green(result.stats.totalSessions)}`)
    this.log(`Events: ${chalk.green(result.stats.totalEvents)}`)
    this.log(`Chunks: ${chalk.green(result.stats.chunks || 0)}`)
    this.log(`Problems identified: ${chalk.green(result.stats.totalProblems)}`)

    if (result.preview?.length) {
      this.log(chalk.bold.cyan('\nSession Preview:'))
      for (const session of result.preview.slice(0, 20)) {
        this.log(`  - ${session.project || 'Unknown project'} / ${session.sessionId}: ${session.events} events, ${session.durationMinutes}min${session.source ? `, ${session.source}` : ''}`)
      }

      if (result.preview.length > 20) this.log(chalk.dim(`  ... and ${result.preview.length - 20} more sessions`))
    }

    if (dryRun) {
      this.log(chalk.yellow('\nDry run complete: no LLM calls made and no reports written.'))
      return
    }

    if (result.sessions.length === 0) {
      this.log(chalk.yellow('\nNo coding sessions found.'))
      return
    }

    this.log(chalk.bold.cyan('\nDaily Report Preview:'))
    for (const line of result.dailyReport.split('\n').slice(0, 10)) this.log(chalk.dim(`  ${line}`))

    if (outputDir && result.outputFiles?.length) {
      this.log(chalk.bold.green('\nReports saved:'))
      for (const file of result.outputFiles) this.log(chalk.dim(`  - ${file}`))
    } else if (!outputDir) {
      this.log(chalk.dim('\nTip: Use --out <directory> to save reports to files'))
    }
  }
}

import {Command, Flags} from '@oclif/core'
import chalk from 'chalk'

import {scanRegisteredSources} from '../../sources/registry.js'
import {DataSource} from '../../utils/types.js'

export default class SourcesScan extends Command {
  static override description = 'Scan and list available data sources'
  static override examples = ['<%= config.bin %> <%= command.id %>', '<%= config.bin %> <%= command.id %> --json']
  static override flags = {json: Flags.boolean({char: 'j', description: 'Output sources as JSON'})}

  async run(): Promise<void> {
    const {flags} = await this.parse(SourcesScan)
    const sources = await scanRegisteredSources()
    if (flags.json) {
      this.log(JSON.stringify(sources, null, 2))
      return
    }

    this.log(chalk.cyan('Scanning for available data sources...\n'))
    for (const source of sources) this.displaySourceInfo(source)
    const availableSources = sources.filter((source) => source.available)
    const totalFiles = availableSources.reduce((sum, source) => sum + source.filesFound, 0)
    this.log(chalk.yellow('\nSummary:'))
    this.log(`  Available sources: ${chalk.green(availableSources.length)}/${sources.length}`)
    this.log(`  Total files found: ${chalk.green(totalFiles)}`)
    if (availableSources.length === 0) this.log(chalk.red('\nNo data sources found. Make sure Claude Code, SpecStory, or Codex have been used.'))
  }

  private displaySourceInfo(source: DataSource): void {
    const status = source.available ? chalk.green('✓ Available') : chalk.red('✗ Not found')
    const fileCount = source.available ? chalk.cyan(`(${source.filesFound} files)`) : chalk.gray('(0 files)')
    this.log(`${status} ${chalk.bold(source.name)} ${fileCount}`)
    this.log(`  ${chalk.gray(source.description)}`)
    this.log(`  ${chalk.gray(`Type: ${source.type}`)}`)
    for (const sourcePath of source.paths) this.log(`    ${chalk.dim(sourcePath)}`)
    this.log('')
  }
}

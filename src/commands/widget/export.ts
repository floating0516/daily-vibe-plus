import {Command, Flags} from '@oclif/core'
import chalk from 'chalk'
import os from 'node:os'
import path from 'node:path'

import {exportWidget, WidgetTarget} from '../../core/widget-export.js'

export default class WidgetExport extends Command {
  static override description = 'Export desktop widget integrations for latest reports'
  static override flags = {
    force: Flags.boolean({char: 'f', description: 'Overwrite existing widget files'}),
    out: Flags.string({char: 'o', description: 'Output directory for the HTML dashboard'}),
    'report-dir': Flags.string({default: path.join(os.homedir(), 'daily-vibe-reports'), description: 'Directory containing latest.json'}),
    target: Flags.string({char: 't', default: 'ubersicht', description: 'Widget target to export', options: ['html', 'ubersicht', 'all']}),
    'ubersicht-dir': Flags.string({default: path.join(os.homedir(), 'Library/Application Support/Übersicht/widgets'), description: 'Übersicht widgets directory'}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(WidgetExport)
    const result = await exportWidget({
      force: flags.force,
      htmlOutDir: flags.out,
      reportDir: flags['report-dir'],
      target: flags.target as WidgetTarget,
      ubersichtDir: flags['ubersicht-dir'],
    })

    this.log(chalk.green('Exported Daily Vibe Plus widget files:'))
    for (const file of result.files) this.log(`  ${file}`)

    this.log('')
    this.log(chalk.cyan('Next steps:'))
    for (const instruction of result.instructions) this.log(`  ${instruction}`)
    this.log('  For Übersicht, open the Übersicht app and enable daily-vibe-plus.jsx if needed.')
  }
}

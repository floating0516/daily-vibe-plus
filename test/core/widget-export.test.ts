import {expect} from 'chai'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {exportWidget} from '../../src/core/widget-export.js'

async function tempDir(prefix: string): Promise<string> {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), prefix))
}

describe('widget export', () => {
  it('exports the HTML dashboard with the report path injected', async () => {
    const htmlOutDir = await tempDir('daily-vibe-widget-html-')
    const reportDir = await tempDir('daily-vibe-reports-')

    const result = await exportWidget({htmlOutDir, reportDir, target: 'html'})
    const htmlFile = path.join(htmlOutDir, 'index.html')
    const html = await fs.promises.readFile(htmlFile, 'utf8')

    expect(result.files).to.deep.equal([htmlFile])
    expect(html).to.include(path.join(reportDir, 'latest.json'))
    expect(html).not.to.include('__REPORT_JSON_PATH__')
    expect(result.instructions.join('\n')).to.include('daily-vibe analyze today --out')
  })

  it('exports the Übersicht widget with the report path injected', async () => {
    const ubersichtDir = await tempDir('daily-vibe-ubersicht-')
    const reportDir = await tempDir('daily-vibe-reports-')

    const result = await exportWidget({reportDir, target: 'ubersicht', ubersichtDir})
    const widgetFile = path.join(ubersichtDir, 'daily-vibe-plus.jsx')
    const widget = await fs.promises.readFile(widgetFile, 'utf8')

    expect(result.files).to.deep.equal([widgetFile])
    expect(widget).to.include('refreshFrequency')
    expect(widget).to.include(path.join(reportDir, 'latest.json'))
    expect(widget).not.to.include('__REPORT_JSON_PATH__')
  })

  it('refuses to overwrite existing files unless force is enabled', async () => {
    const htmlOutDir = await tempDir('daily-vibe-widget-html-')
    const reportDir = await tempDir('daily-vibe-reports-')

    await exportWidget({htmlOutDir, reportDir, target: 'html'})
    try {
      await exportWidget({htmlOutDir, reportDir, target: 'html'})
      expect.fail('Expected exportWidget to reject existing files')
    } catch (error) {
      expect(String(error)).to.include('already exists')
    }

    const result = await exportWidget({force: true, htmlOutDir, reportDir, target: 'html'})

    expect(result.files).to.deep.equal([path.join(htmlOutDir, 'index.html')])
  })
})

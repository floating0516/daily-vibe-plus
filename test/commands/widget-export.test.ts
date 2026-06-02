import {runCommand} from '@oclif/test'
import {expect} from 'chai'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

async function tempDir(prefix: string): Promise<string> {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), prefix))
}

describe('widget export command', () => {
  it('exports the HTML dashboard', async () => {
    const htmlOutDir = await tempDir('daily-vibe-widget-html-')
    const reportDir = await tempDir('daily-vibe-reports-')

    const result = await runCommand(['widget export', '--target', 'html', '--out', htmlOutDir, '--report-dir', reportDir])

    expect(result.error).to.equal(undefined)
    expect(fs.existsSync(path.join(htmlOutDir, 'index.html'))).to.equal(true)
    expect(result.stdout).to.contain('index.html')
    expect(result.stdout).to.contain('latest.json')
    expect(result.stdout).to.contain('daily-vibe analyze today --out')
  })

  it('exports the Übersicht widget', async () => {
    const ubersichtDir = await tempDir('daily-vibe-ubersicht-')
    const reportDir = await tempDir('daily-vibe-reports-')

    const result = await runCommand(['widget export', '--target', 'ubersicht', '--ubersicht-dir', ubersichtDir, '--report-dir', reportDir])

    expect(result.error).to.equal(undefined)
    expect(fs.existsSync(path.join(ubersichtDir, 'daily-vibe-plus.jsx'))).to.equal(true)
    expect(result.stdout).to.contain('daily-vibe-plus.jsx')
  })

  it('requires force to overwrite files', async () => {
    const htmlOutDir = await tempDir('daily-vibe-widget-html-')
    const reportDir = await tempDir('daily-vibe-reports-')

    await runCommand(['widget export', '--target', 'html', '--out', htmlOutDir, '--report-dir', reportDir])

    const failed = await runCommand(['widget export', '--target', 'html', '--out', htmlOutDir, '--report-dir', reportDir])
    expect(failed.error?.message).to.contain('already exists')

    const forced = await runCommand(['widget export', '--target', 'html', '--out', htmlOutDir, '--report-dir', reportDir, '--force'])
    expect(forced.error).to.equal(undefined)
    expect(forced.stdout).to.contain('index.html')
  })
})

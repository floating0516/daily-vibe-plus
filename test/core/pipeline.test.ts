import {expect} from 'chai'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {AnalysisPipeline} from '../../src/core/pipeline.js'
import {RedactionEngine} from '../../src/core/redact.js'
import {AppConfig, SessionSummary} from '../../src/utils/types.js'

describe('AnalysisPipeline output and dry run', () => {
  const baseConfig: AppConfig = {llm: {provider: 'openai'}, output: {writeLatest: false, writeRawData: false}, redact: {enabled: true, patterns: []}, timezone: 'UTC'}

  it('saves only reports by default and records actual written files', async () => {
    const out = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'daily-vibe-out-'))
    const pipeline = new AnalysisPipeline(new RedactionEngine(baseConfig.redact), baseConfig)
    const result = {dailyReport: 'daily', date: '2026-05-30', knowledge: 'knowledge', sessions: [], stats: {totalEvents: 0, totalProblems: 0, totalSessions: 0}}

    const files = await pipeline.saveResults(result, out)

    expect(files.map(f => path.basename(f))).to.deep.equal(['daily.md', 'knowledge.md'])
    expect(fs.existsSync(path.join(out, '2026-05-30', 'data.json'))).to.equal(false)
  })

  it('writes data.json only when rawData is enabled', async () => {
    const out = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'daily-vibe-out-'))
    const pipeline = new AnalysisPipeline(new RedactionEngine(baseConfig.redact), baseConfig)
    const result = {dailyReport: 'daily', date: '2026-05-30', knowledge: 'knowledge', sessions: [], stats: {totalEvents: 0, totalProblems: 0, totalSessions: 0}}

    const files = await pipeline.saveResults(result, out, {rawData: true})

    expect(files.map(f => path.basename(f))).to.deep.equal(['daily.md', 'knowledge.md', 'data.json'])
  })

  it('writes latest.md and latest.json when latest output is enabled', async () => {
    const out = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'daily-vibe-out-'))
    const pipeline = new AnalysisPipeline(new RedactionEngine(baseConfig.redact), baseConfig)
    const result = {dailyReport: '# Daily\n\nSummary line', date: '2026-05-30', knowledge: 'knowledge', sessions: [], stats: {totalEvents: 0, totalProblems: 0, totalSessions: 0}}

    const files = await pipeline.saveResults(result, out, {latest: true})

    expect(files.map(f => path.basename(f))).to.deep.equal(['daily.md', 'knowledge.md', 'latest.md', 'latest.json'])
    expect(fs.existsSync(path.join(out, 'latest.md'))).to.equal(true)
    expect(JSON.parse(await fs.promises.readFile(path.join(out, 'latest.json'), 'utf8')).summary).to.equal('Summary line')
  })



  it('supports dry-run analysis without writing files or calling LLM', async () => {
    const pipeline = new AnalysisPipeline(new RedactionEngine(baseConfig.redact), baseConfig)
    const result = await pipeline.analyzeDay(new Date('1900-01-01T12:00:00Z'), {dryRun: true, outputDir: await fs.promises.mkdtemp(path.join(os.tmpdir(), 'daily-vibe-dry-')), preview: true, sources: ['claude-code']})

    expect(result.dailyReport).to.include('Dry Run')
    expect(result.knowledge).to.include('No report files were written')
    expect(result.outputFiles).to.equal(undefined)
    expect(result.preview).to.deep.equal([])
    expect(result.stats.chunks).to.equal(0)
  })

  it('filters sessions by project/exclude/min-events', () => {
    const sessions: SessionSummary[] = [
      {endTime: new Date(), events: [{content: 'a', role: 'user', timestamp: new Date()}], project: 'one', sessionId: '1', startTime: new Date()},
      {endTime: new Date(), events: [{content: 'a', role: 'user', timestamp: new Date()}, {content: 'b', role: 'assistant', timestamp: new Date()}], project: 'two', sessionId: '2', startTime: new Date()},
    ]

    const filtered = AnalysisPipeline.filterSessions(sessions, {excludeProjects: ['one'], minEvents: 2, projects: ['one', 'two']})

    expect(filtered.map(s => s.sessionId)).to.deep.equal(['2'])
  })
})

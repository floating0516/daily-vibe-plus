import {expect} from 'chai'

import {buildLatestReport} from '../../src/core/latest-report.js'
import {AnalysisResult} from '../../src/utils/types.js'

function resultWithDailyReport(dailyReport: string): AnalysisResult {
  return {
    dailyReport,
    date: '2026-05-31',
    knowledge: '# Knowledge',
    sessions: [],
    stats: {chunks: 2, totalEvents: 20, totalProblems: 1, totalSessions: 3},
  }
}

describe('latest report', () => {

  it('extracts summary, highlights, and blockers from markdown sections', () => {
    const report = buildLatestReport(resultWithDailyReport(`# Daily Report

Today shipped the widget integration.

## Key Outputs
- Added latest.json
- Added WidgetKit app

## Blockers
- Schedule command is still pending
`), {daily: '/tmp/daily.md', knowledge: '/tmp/knowledge.md'})

    expect(report.summary).to.equal('Today shipped the widget integration.')
    expect(report.highlights).to.deep.equal(['Added latest.json', 'Added WidgetKit app'])
    expect(report.blockers).to.deep.equal(['Schedule command is still pending'])
    expect(report.files.daily).to.equal('/tmp/daily.md')
    expect(report.stats.totalSessions).to.equal(3)
  })

  it('falls back to stats when no summary can be extracted', () => {
    const report = buildLatestReport(resultWithDailyReport('# Daily Report\n\n## Key Outputs'), {})

    expect(report.summary).to.equal('3 sessions, 20 events, 1 problems identified')
    expect(report.highlights).to.deep.equal([])
  })
})

import {expect} from 'chai'

import {AnalysisPipeline} from '../../src/core/pipeline.js'
import {RedactionEngine} from '../../src/core/redact.js'
import {SessionSummary} from '../../src/utils/types.js'

describe('redaction', () => {
  it('redacts default secrets without user-supplied patterns', () => {
    const engine = new RedactionEngine(undefined)
    const result = engine.redact('token=ghp_1234567890abcdefghijklmnopqrstuvwxyz secret=AKIA1234567890ABCDEF')

    expect(result.redacted).to.not.include('ghp_1234567890abcdefghijklmnopqrstuvwxyz')
    expect(result.redacted).to.not.include('AKIA1234567890ABCDEF')
  })

  it('recursively redacts session event, tool, file diff, and metadata strings while preserving Date', () => {
    const timestamp = new Date('2026-05-30T10:00:00Z')
    const engine = new RedactionEngine({enabled: true, patterns: ['SECRET_[A-Z]+']})
    const session: SessionSummary = {
      endTime: timestamp,
      events: [{
        content: 'event SECRET_VALUE',
        fileDiffs: [{after: 'after SECRET_VALUE', before: 'before SECRET_VALUE', content: 'content SECRET_VALUE', file: '/tmp/SECRET_VALUE.txt', operation: 'update'}],
        metadata: {nested: {key: 'SECRET_VALUE'}, when: timestamp},
        role: 'user',
        timestamp,
        toolRuns: [{command: 'echo SECRET_VALUE', error: 'err SECRET_VALUE', input: 'in SECRET_VALUE', output: 'out SECRET_VALUE', tool: 'bash'}],
      }],
      sessionId: 's1',
      startTime: timestamp,
    }

    const redacted = AnalysisPipeline.redactSessionSummaries([session], engine)[0]

    expect(JSON.stringify(redacted)).to.not.include('SECRET_VALUE')
    expect(redacted.events[0].timestamp).to.equal(timestamp)
    expect((redacted.events[0].metadata as {when: unknown}).when).to.equal(timestamp)
  })
})

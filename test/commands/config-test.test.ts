import {expect} from 'chai'

import {buildConfigTestReport} from '../../src/commands/config/test.js'

describe('config test command', () => {
  it('builds a skip-llm report without calling network smoke test', async () => {
    let called = false
    const report = await buildConfigTestReport({scanSources: async () => [], skipLlm: true, async smokeTest() { called = true }})

    expect(called).to.equal(false)
    expect(report.checks.some((c: {name: string; status: string}) => c.name === 'llm smoke test' && c.status === 'skipped')).to.equal(true)
  })
})

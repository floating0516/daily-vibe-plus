import {expect} from 'chai'

import {DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL, resolveLLMConfig} from '../../src/core/llm.js'

describe('llm config resolution', () => {
  it('uses defaults unless model/baseUrl/provider overrides are supplied', () => {
    expect(resolveLLMConfig({provider: 'openai'}).model).to.equal(DEFAULT_OPENAI_MODEL)
    expect(resolveLLMConfig({provider: 'anthropic'}).model).to.equal(DEFAULT_ANTHROPIC_MODEL)

    const resolved = resolveLLMConfig({provider: 'openai'}, {baseUrl: 'http://localhost:1234/v1', model: 'gpt-test', provider: 'generic'})

    expect(resolved.provider).to.equal('generic')
    expect(resolved.model).to.equal('gpt-test')
    expect(resolved.baseUrl).to.equal('http://localhost:1234/v1')
  })
})

import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import OpenAI from 'openai'

import {LLMConfig} from '../utils/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
export const DEFAULT_ANTHROPIC_MODEL = 'claude-3-haiku-20240307'
export const DEFAULT_GENERIC_MODEL = 'gpt-3.5-turbo'

export interface LLMClient {
  extractKnowledge(input: string, date: string): Promise<string>
  summarizeDaily(input: string, date: string): Promise<string>
}

export type LLMOverrides = Partial<Pick<LLMConfig, 'baseUrl' | 'model' | 'provider'>>

export function resolveLLMConfig(config: LLMConfig, overrides: LLMOverrides = {}): LLMConfig {
  const provider = overrides.provider || config.provider
  const model = overrides.model || config.model || (provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : provider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_GENERIC_MODEL)
  return {...config, ...overrides, model, provider}
}

abstract class TemplateLoader {
  protected async loadTemplate(filename: string): Promise<string> {
    const templatePath = path.join(__dirname, '..', 'prompts', filename)
    return fs.promises.readFile(templatePath, 'utf8')
  }
}

interface OpenAIChatClient {
  chat: {
    completions: {
      create(options: {messages: Array<{content: string; role: 'user'}>; model: string}): Promise<{choices: Array<{message?: {content?: null | string}}>}>
    }
  }
}

interface AnthropicMessagesClient {
  messages: {
    create(options: {max_tokens: number; messages: Array<{content: string; role: 'user'}>; model: string}): Promise<{content: Array<{text?: string; type: string}>}>
  }
}

export class OpenAILLMClient extends TemplateLoader implements LLMClient {
  private client: OpenAIChatClient
  private config: LLMConfig

  constructor(config: LLMConfig) {
    super()
    this.config = resolveLLMConfig(config)
    this.client = new (OpenAI as unknown as {new (options: {apiKey?: string; baseURL?: string}): OpenAIChatClient})({apiKey: this.config.apiKey || process.env.OPENAI_API_KEY, baseURL: this.config.baseUrl})
  }

  async extractKnowledge(input: string, date: string): Promise<string> {
    const prompt = (await this.loadTemplate('knowledge.md')).replace('{sessions}', input).replace('{date}', date)
    const completion = await this.client.chat.completions.create({messages: [{content: prompt, role: 'user'}], model: this.config.model || DEFAULT_OPENAI_MODEL})
    return completion.choices[0]?.message?.content || ''
  }

  async summarizeDaily(input: string, date: string): Promise<string> {
    const prompt = (await this.loadTemplate('daily.md')).replace('{sessions}', input).replace('{date}', date)
    const completion = await this.client.chat.completions.create({messages: [{content: prompt, role: 'user'}], model: this.config.model || DEFAULT_OPENAI_MODEL})
    return completion.choices[0]?.message?.content || ''
  }
}

export class AnthropicLLMClient extends TemplateLoader implements LLMClient {
  private client: AnthropicMessagesClient
  private config: LLMConfig

  constructor(config: LLMConfig) {
    super()
    this.config = resolveLLMConfig(config)
    this.client = new (Anthropic as unknown as {new (options: {apiKey?: string; baseURL?: string}): AnthropicMessagesClient})({apiKey: this.config.apiKey || process.env.ANTHROPIC_API_KEY, baseURL: this.config.baseUrl})
  }

  async extractKnowledge(input: string, date: string): Promise<string> {
    const prompt = (await this.loadTemplate('knowledge.md')).replace('{sessions}', input).replace('{date}', date)
    const completion = await this.client.messages.create({// eslint-disable-next-line camelcase
      max_tokens: 4096, messages: [{content: prompt, role: 'user'}], model: this.config.model || DEFAULT_ANTHROPIC_MODEL})
    return completion.content[0]?.type === 'text' ? completion.content[0].text || '' : ''
  }

  async summarizeDaily(input: string, date: string): Promise<string> {
    const prompt = (await this.loadTemplate('daily.md')).replace('{sessions}', input).replace('{date}', date)
    const completion = await this.client.messages.create({// eslint-disable-next-line camelcase
      max_tokens: 4096, messages: [{content: prompt, role: 'user'}], model: this.config.model || DEFAULT_ANTHROPIC_MODEL})
    return completion.content[0]?.type === 'text' ? completion.content[0].text || '' : ''
  }
}

export class GenericOpenAIClient extends OpenAILLMClient {}

export function createLLMClient(config: LLMConfig, overrides: LLMOverrides = {}): LLMClient {
  const resolved = resolveLLMConfig(config, overrides)
  switch (resolved.provider) {
    case 'anthropic': { return new AnthropicLLMClient(resolved)
    }

    case 'generic': { return new GenericOpenAIClient(resolved)
    }

    case 'openai': { return new OpenAILLMClient(resolved)
    }

    default: { throw new Error(`Unsupported LLM provider: ${resolved.provider}`)
    }
  }
}

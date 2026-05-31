import {DEFAULT_REDACTION_PATTERNS, loadConfig} from '../utils/config.js'
import {AppConfig} from '../utils/types.js'

export interface RedactionResult {
  matches: Array<{match: string; pattern: string; replacement: string}>
  original: string
  redacted: string
}

export class RedactionEngine {
  private enabled: boolean
  private patterns: RegExp[]
  private patternStrings: string[]

  constructor(config: AppConfig['redact']) {
    this.enabled = config?.enabled ?? true
    this.patternStrings = config?.patterns?.length ? config.patterns : DEFAULT_REDACTION_PATTERNS
    this.patterns = this.patternStrings.map((pattern) => {
      try {
        return new RegExp(pattern, 'gi')
      } catch {
        return null
      }
    }).filter(Boolean) as RegExp[]
  }

  static async fromConfig(): Promise<RedactionEngine> {
    const config = await loadConfig()
    return new RedactionEngine(config.redact)
  }

  redact(text: string): RedactionResult {
    if (!this.enabled || !text || typeof text !== 'string') return {matches: [], original: text || '', redacted: text || ''}
    let redacted = text
    const matches: RedactionResult['matches'] = []
    for (let i = 0; i < this.patterns.length; i++) {
      const pattern = this.patterns[i]
      const patternString = this.patternStrings[i]
      let match: null | RegExpExecArray
      pattern.lastIndex = 0
      while ((match = pattern.exec(text)) !== null) {
        const matchedText = match[0]
        const replacement = this.generateReplacement(patternString)
        matches.push({match: matchedText, pattern: patternString, replacement})
        redacted = redacted.split(matchedText).join(replacement)
        if (!pattern.global || matchedText.length === 0) break
      }
    }

    return {matches, original: text, redacted}
  }

  redactMultiple(texts: string[]): RedactionResult[] {
    return texts.map((text) => this.redact(text))
  }

  redactValue<T>(value: T): T {
    if (value instanceof Date) return value
    if (typeof value === 'string') return this.redact(value).redacted as T
    if (Array.isArray(value)) return value.map((item) => this.redactValue(item)) as T
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, this.redactValue(nested)])) as T
    }

    return value
  }

  test(testString: string): RedactionResult {
    return this.redact(testString)
  }

  private generateReplacement(pattern: string): string {
    if (/ghp_|github/i.test(pattern)) return '[REDACTED_GITHUB_TOKEN]'
    if (/sk-|api|bearer|token|secret|password|AKIA|ASIA/i.test(pattern)) return '[REDACTED_SECRET]'
    if (pattern.includes('@') || /email/i.test(pattern)) return '[REDACTED_EMAIL]'
    if (/phone|\d/.test(pattern)) return '[REDACTED_NUMBER]'
    return '[REDACTED]'
  }
}

export async function redactText(text: string): Promise<string> {
  const engine = await RedactionEngine.fromConfig()
  return engine.redact(text).redacted
}

export async function testRedaction(testString: string): Promise<RedactionResult> {
  const engine = await RedactionEngine.fromConfig()
  return engine.test(testString)
}

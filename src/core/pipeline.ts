import path from 'node:path'

import {ALL_SOURCE_TYPES, collectRegisteredEvents, normalizeSources} from '../sources/registry.js'
import {loadConfig} from '../utils/config.js'
import {ensureDir, writeFile} from '../utils/fs.js'
import {formatDate, getDateRange, getDayRange} from '../utils/time.js'
import {AnalysisPreviewResult, AnalysisProgressEvent, AnalysisResult, AppConfig, SessionEvent, SessionPreview, SessionSummary, SourceType} from '../utils/types.js'
import {createLLMClient, LLMClient, LLMOverrides, resolveLLMConfig} from './llm.js'
import {RedactionEngine} from './redact.js'

export interface AnalyzeOptions {
  baseUrl?: string
  date?: Date
  dateRange?: {from: Date; to: Date}
  dryRun?: boolean
  enableRedaction?: boolean
  excludeProjects?: string[]
  minEvents?: number
  model?: string
  outputDir?: string
  preview?: boolean
  progress?: (message: string) => void
  progressEvent?: (event: AnalysisProgressEvent) => void
  projects?: string[]
  provider?: 'anthropic' | 'generic' | 'openai'
  rawData?: boolean
  sources?: SourceType[]
}

interface AnalyzeWindowInput {
  dateStr: string
  end: Date
  options: AnalyzeOptions
  prefix?: string
  start: Date
}

interface SavePreviewInput {
  date: string
  outputDir: string
  prefix?: string
  rawData: boolean
}

export class AnalysisPipeline {
  private config: AppConfig
  private redactionEngine: RedactionEngine

  constructor(redactionEngine: RedactionEngine, config: AppConfig) {
    this.config = config
    this.redactionEngine = redactionEngine
  }

  static async create(): Promise<AnalysisPipeline> {
    const config = await loadConfig()
    const redactionEngine = new RedactionEngine(config.redact)
    return new AnalysisPipeline(redactionEngine, config)
  }

  static filterSessions(sessions: SessionSummary[], options: Pick<AnalyzeOptions, 'excludeProjects' | 'minEvents' | 'projects'>): SessionSummary[] {
    return sessions.filter((session) => {
      const project = session.project || 'unknown'
      if (options.projects?.length && !options.projects.includes(project)) return false
      if (options.excludeProjects?.includes(project)) return false
      if (options.minEvents && session.events.length < options.minEvents) return false
      return true
    })
  }

  static redactSessionSummaries(sessions: SessionSummary[], engine: RedactionEngine): SessionSummary[] {
    return engine.redactValue(sessions)
  }

  async analyzeDateRange(from: Date, to: Date, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
    const {end: rangeEnd, start: rangeStart} = getDateRange(from, to, this.config.timezone)
    return this.analyzeWindow({dateStr: `${formatDate(from)} to ${formatDate(to)}`, end: rangeEnd, options, prefix: 'range', start: rangeStart})
  }

  async analyzeDay(date: Date, options: AnalyzeOptions = {}): Promise<AnalysisResult> {
    const {end: dayEnd, start: dayStart} = getDayRange(date, this.config.timezone)
    return this.analyzeWindow({dateStr: formatDate(date), end: dayEnd, options, start: dayStart})
  }

  async saveResults(result: AnalysisResult, outputDir: string, options: {prefix?: string; rawData?: boolean} = {}): Promise<string[]> {
    const reportDir = this.getReportDir(outputDir, result.date, options.prefix)
    await ensureDir(reportDir)
    const files = [path.join(reportDir, 'daily.md'), path.join(reportDir, 'knowledge.md')]
    await writeFile(files[0], result.dailyReport)
    await writeFile(files[1], result.knowledge)
    if (options.rawData) {
      const dataFile = path.join(reportDir, 'data.json')
      await writeFile(dataFile, JSON.stringify(result, null, 2))
      files.push(dataFile)
    }

    return files
  }

  private async analyzeWindow(input: AnalyzeWindowInput): Promise<AnalysisResult> {
    const {dateStr, end, options, prefix, start} = input
    const enabledSources = this.resolveSources(options.sources)
    this.reportProgress(options, {stage: 'scan', status: 'start'}, 'Collecting session data...')
    const collected = await collectRegisteredEvents({dayEnd: end, dayStart: start, sources: enabledSources})
    this.reportProgress(options, {detail: `${collected.sessions.length} sessions, ${collected.events.length} events`, stage: 'scan', status: 'done'}, `Collected ${collected.sessions.length} sessions and ${collected.events.length} events.`)

    this.reportProgress(options, {stage: 'filter', status: 'start'}, 'Filtering sessions...')
    const filteredSessions = AnalysisPipeline.filterSessions(collected.sessions, options)
    const filteredIds = new Set(filteredSessions.map((session) => session.sessionId))
    const filteredEvents = collected.events.filter((event) => !event.sessionId || filteredIds.has(event.sessionId))
    this.reportProgress(options, {detail: `${filteredSessions.length} sessions kept`, stage: 'filter', status: 'done'}, `Kept ${filteredSessions.length} sessions and ${filteredEvents.length} events after filters.`)

    this.reportProgress(options, {stage: 'redact', status: 'start'}, 'Applying redaction...')
    const redactionEnabled = options.enableRedaction !== false
    const processedSessions = redactionEnabled ? AnalysisPipeline.redactSessionSummaries(filteredSessions, this.redactionEngine) : filteredSessions
    this.reportProgress(options, {detail: redactionEnabled ? 'enabled' : 'disabled', stage: 'redact', status: 'done'}, `Redaction ${redactionEnabled ? 'enabled' : 'disabled'}.`)

    this.reportProgress(options, {stage: 'chunk', status: 'start'}, 'Estimating chunks...')
    const chunks = this.splitSessionsIntoChunks(processedSessions)
    this.reportProgress(options, {detail: `${chunks.length} chunk(s)`, stage: 'chunk', status: 'done'}, `Estimated ${chunks.length} chunk(s).`)

    const rawData = options.rawData ?? this.config.output?.writeRawData ?? false
    const previewResult = this.createAnalysisPreview({chunks: chunks.length, date: dateStr, enabledSources, eventsAfterFilter: filteredEvents.length, eventsBeforeFilter: collected.events.length, filesScanned: collected.filesScanned, options, prefix, processedSessions, rawData, sessionsBeforeFilter: collected.sessions.length})
    const baseResult: AnalysisResult = {
      dailyReport: '',
      date: dateStr,
      knowledge: '',
      preview: options.preview || options.dryRun ? this.createPreview(processedSessions) : undefined,
      previewResult,
      sessions: processedSessions,
      stats: {
        chunks: chunks.length,
        eventsAfterFilter: filteredEvents.length,
        eventsBeforeFilter: collected.events.length,
        filesScanned: collected.filesScanned.length,
        sessionsAfterFilter: processedSessions.length,
        sessionsBeforeFilter: collected.sessions.length,
        totalEvents: filteredEvents.length,
        totalProblems: this.extractProblemSolutions(processedSessions).length,
        totalSessions: processedSessions.length,
      },
    }

    if (options.dryRun) {
      baseResult.dailyReport = `# Dry Run - ${dateStr}\n\nNo LLM calls were made.`
      baseResult.knowledge = `# Dry Run - ${dateStr}\n\nNo report files were written.`
      this.reportProgress(options, {stage: 'done', status: 'done'}, 'Dry run complete.')
      return baseResult
    }

    this.reportProgress(options, {detail: `${chunks.length} chunk(s)`, stage: 'llm', status: 'start'}, `Analyzing ${chunks.length} chunk(s)...`)
    const llmOverrides: LLMOverrides = {baseUrl: options.baseUrl, model: options.model, provider: options.provider}
    const llmClient = createLLMClient(this.config.llm, llmOverrides)
    const [dailyReport, knowledge] = await Promise.all([
      this.generateChunkedAnalysis({analysisType: 'daily', chunks, dateStr, llmClient, options}),
      this.generateChunkedAnalysis({analysisType: 'knowledge', chunks, dateStr, llmClient, options}),
    ])
    baseResult.dailyReport = dailyReport
    baseResult.knowledge = knowledge
    this.reportProgress(options, {stage: 'llm', status: 'done'}, 'LLM analysis complete.')

    if (options.outputDir) {
      this.reportProgress(options, {stage: 'write', status: 'start'}, 'Writing report files...')
      baseResult.outputFiles = await this.saveResults(baseResult, options.outputDir, {prefix, rawData})
      this.reportProgress(options, {detail: `${baseResult.outputFiles.length} file(s)`, stage: 'write', status: 'done'}, `Wrote ${baseResult.outputFiles.length} report file(s).`)
    }

    this.reportProgress(options, {stage: 'done', status: 'done'}, 'Analysis complete.')
    return baseResult
  }

  private containsErrorPattern(content: string): boolean {
    const patterns = [/error|exception|traceback|npm ERR!/i, /TypeError|ValueError|SyntaxError|ReferenceError/i, /panic|fatal|abort|crash/i, /failed|failure|unsuccessful/i, /cannot find|not found|undefined|null/i, /permission denied|access denied/i, /connection refused|timeout/i]
    return patterns.some((pattern) => pattern.test(content))
  }

  private createAnalysisPreview(input: {chunks: number; date: string; enabledSources: SourceType[]; eventsAfterFilter: number; eventsBeforeFilter: number; filesScanned: string[]; options: AnalyzeOptions; prefix?: string; processedSessions: SessionSummary[]; rawData: boolean; sessionsBeforeFilter: number}): AnalysisPreviewResult {
    const {chunks, date, enabledSources, eventsAfterFilter, eventsBeforeFilter, filesScanned, options, prefix, processedSessions, rawData, sessionsBeforeFilter} = input
    const resolvedLlm = resolveLLMConfig(this.config.llm, {baseUrl: options.baseUrl, model: options.model, provider: options.provider})
    return {
      chunks,
      date,
      enabledSources,
      eventsAfterFilter,
      eventsBeforeFilter,
      filesScanned,
      filters: {excludeProjects: options.excludeProjects, minEvents: options.minEvents, projects: options.projects},
      llm: {baseUrl: resolvedLlm.baseUrl, model: resolvedLlm.model, provider: resolvedLlm.provider},
      output: {rawData, wouldWriteFiles: options.outputDir ? this.previewOutputFiles({date, outputDir: options.outputDir, prefix, rawData}) : []},
      redactionEnabled: options.enableRedaction !== false,
      sessionsAfterFilter: processedSessions.length,
      sessionsBeforeFilter,
    }
  }

  private createDailyIntegrationPrompt(chunkAnalyses: string[], dateStr: string): string {
    return `请整合以下多个时段的开发日报分析，生成统一的日报：\n\n日期：${dateStr}\n\n分段分析结果：\n${chunkAnalyses.map((analysis, index) => `## 时段 ${index + 1}：\n${analysis}\n`).join('\n---\n\n')}\n请将这些分段分析整合成一份完整的开发日报，包括整体概览、关键产出、运行测试和待办事项。保持原有的中文格式和Markdown结构。`
  }

  private createKnowledgeIntegrationPrompt(chunkAnalyses: string[], dateStr: string): string {
    return `请整合以下多个时段的知识库分析，生成统一的知识库：\n\n日期：${dateStr}\n\n分段分析结果：\n${chunkAnalyses.map((analysis, index) => `## 时段 ${index + 1}：\n${analysis}\n`).join('\n---\n\n')}\n请去重相似问题，按技术领域分类整理，并提取通用规则。保持原有的中文格式和Markdown结构。`
  }

  private createPreview(sessions: SessionSummary[]): SessionPreview[] {
    return sessions.map((session) => ({durationMinutes: Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60_000), events: session.events.length, project: session.project, sessionId: session.sessionId, source: String(session.events[0]?.metadata?.source || '') || undefined}))
  }

  private estimateSessionLength(session: SessionSummary): number {
    return 200 + session.events.reduce((total, event) => total + (event.content?.length || 0) + 150, 0)
  }

  private extractProblemSolutions(sessions: SessionSummary[]): Array<{context: string; events: SessionEvent[]; problem: string; solution: string}> {
    const problems: Array<{context: string; events: SessionEvent[]; problem: string; solution: string}> = []
    for (const session of sessions) {
      for (let i = 0; i < session.events.length; i++) {
        const event = session.events[i]
        if (this.containsErrorPattern(event.content) || event.toolRuns?.some((run) => run.error || run.exitCode !== 0)) {
          const solutionEvents = session.events.slice(i + 1, i + 5).filter((e) => e.role === 'assistant')
          if (solutionEvents.length > 0) problems.push({context: session.project || 'unknown', events: [event, ...solutionEvents], problem: event.content, solution: solutionEvents.map((e) => e.content).join('\n')})
        }
      }
    }

    return problems
  }

  private formatSessionsForLLM(sessions: SessionSummary[]): string {
    const maxEventContentLength = 3000
    return sessions.map((session) => {
      const processedEvents = session.events.map((event) => {
        let {content} = event
        if (content.length > maxEventContentLength) content = `${content.slice(0, maxEventContentLength)}... [内容过长已截断]`
        let eventStr = `[${event.timestamp.toISOString()}] ${event.role}: ${content}`
        if (event.toolRuns?.length) eventStr += `\n  Tools: ${event.toolRuns.map((run) => `${run.tool || run.command}: ${(run.output || run.error || 'executed').slice(0, 300)}`).join('; ')}`
        return eventStr
      }).slice(0, 100)
      return `Session: ${session.sessionId} (${session.project || 'unknown project'})\nTime: ${session.startTime.toISOString()} - ${session.endTime.toISOString()}\n${processedEvents.join('\n')}\n---\n`
    }).join('\n')
  }

  private async generateChunkedAnalysis(input: {analysisType: 'daily' | 'knowledge'; chunks: SessionSummary[][]; dateStr: string; llmClient: LLMClient; options: AnalyzeOptions}): Promise<string> {
    const {analysisType, chunks, dateStr, llmClient, options} = input
    if (chunks.length === 0) return analysisType === 'daily' ? `# 开发日报 - ${dateStr}\n\n## 概览\n没有找到编程会话记录。` : `# 知识库 - ${dateStr}\n\n## 说明\n没有找到可分析的问题和解决方案。`
    if (chunks.length === 1) {
      const sessionSummary = this.formatSessionsForLLM(chunks[0])
      return analysisType === 'daily' ? llmClient.summarizeDaily(sessionSummary, dateStr) : llmClient.extractKnowledge(sessionSummary, dateStr)
    }

    options.progress?.(`Analyzing ${chunks.length} ${analysisType} chunks in parallel...`)
    const chunkAnalyses = await Promise.all(chunks.map(async (chunk, index) => {
      options.progressEvent?.({detail: `${analysisType} chunk ${index + 1}/${chunks.length}`, stage: 'llm', status: 'start'})
      options.progress?.(`Starting ${analysisType} chunk ${index + 1}/${chunks.length}...`)
      const chunkSummary = this.formatSessionsForLLM(chunk)
      const chunkDateStr = `${dateStr} (第${index + 1}/${chunks.length}部分)`
      const analysis = analysisType === 'daily' ? await llmClient.summarizeDaily(chunkSummary, chunkDateStr) : await llmClient.extractKnowledge(chunkSummary, chunkDateStr)
      options.progressEvent?.({detail: `${analysisType} chunk ${index + 1}/${chunks.length}`, stage: 'llm', status: 'done'})
      options.progress?.(`Completed ${analysisType} chunk ${index + 1}/${chunks.length}.`)
      return analysis
    }))
    options.progress?.(`Integrating ${analysisType} analysis results...`)
    return this.integrateChunkAnalyses(chunkAnalyses, analysisType, dateStr, llmClient)
  }

  private getReportDir(outputDir: string, date: string, prefix?: string): string {
    const dirName = prefix ? `${prefix}-${date.replace(/\s+to\s+/, '_')}` : date.replace(/\s+to\s+/, '_')
    return path.join(outputDir, dirName)
  }

  private async integrateChunkAnalyses(chunkAnalyses: string[], analysisType: 'daily' | 'knowledge', dateStr: string, llmClient: LLMClient): Promise<string> {
    const integrationPrompt = analysisType === 'daily' ? this.createDailyIntegrationPrompt(chunkAnalyses, dateStr) : this.createKnowledgeIntegrationPrompt(chunkAnalyses, dateStr)
    return analysisType === 'daily' ? llmClient.summarizeDaily(integrationPrompt, dateStr) : llmClient.extractKnowledge(integrationPrompt, dateStr)
  }

  private previewOutputFiles(input: SavePreviewInput): string[] {
    const reportDir = this.getReportDir(input.outputDir, input.date, input.prefix)
    const files = [path.join(reportDir, 'daily.md'), path.join(reportDir, 'knowledge.md')]
    if (input.rawData) files.push(path.join(reportDir, 'data.json'))
    return files
  }

  private reportProgress(options: AnalyzeOptions, event: AnalysisProgressEvent, message: string): void {
    options.progressEvent?.(event)
    options.progress?.(message)
  }

  private resolveSources(optionSources?: SourceType[]): SourceType[] {
    return normalizeSources(optionSources || this.config.sources?.enabled || ALL_SOURCE_TYPES)
  }

  private splitSessionsIntoChunks(sessions: SessionSummary[]): SessionSummary[][] {
    const maxChunkLength = 80_000
    const chunks: SessionSummary[][] = []
    let currentChunk: SessionSummary[] = []
    let currentChunkLength = 0
    for (const session of sessions) {
      const sessionLength = this.estimateSessionLength(session)
      if (currentChunkLength + sessionLength > maxChunkLength && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = [session]
        currentChunkLength = sessionLength
      } else {
        currentChunk.push(session)
        currentChunkLength += sessionLength
      }
    }

    if (currentChunk.length > 0) chunks.push(currentChunk)
    return chunks
  }
}

export type SourceType = 'claude-code' | 'codex-cli' | 'codex-vscode' | 'specstory'

export interface SessionEvent {
  content: string
  fileDiffs?: FileDiff[]
  id?: string
  metadata?: Record<string, unknown>
  project?: string
  role: 'assistant' | 'system' | 'tool' | 'user'
  sessionId?: string
  timestamp: Date
  toolRuns?: ToolRun[]
}

export interface ToolRun {
  command?: string
  error?: string
  exitCode?: number
  input?: string
  output?: string
  tool?: string
}

export interface FileDiff {
  after?: string
  before?: string
  content?: string
  file: string
  operation: 'create' | 'delete' | 'update'
}

export interface SessionSummary {
  endTime: Date
  events: SessionEvent[]
  problemSolutions?: ProblemSolution[]
  project?: string
  sessionId: string
  startTime: Date
}

export interface ProblemSolution {
  context: string
  events: SessionEvent[]
  problem: string
  solution: string
}

export interface AnalysisStats {
  chunks?: number
  eventsAfterFilter?: number
  eventsBeforeFilter?: number
  filesScanned?: number
  sessionsAfterFilter?: number
  sessionsBeforeFilter?: number
  totalEvents: number
  totalProblems: number
  totalSessions: number
}

export interface AnalysisResult {
  dailyReport: string
  date: string
  knowledge: string
  latestReport?: LatestReport
  outputFiles?: string[]
  preview?: SessionPreview[]
  previewResult?: AnalysisPreviewResult
  sessions: SessionSummary[]
  stats: AnalysisStats
}

export interface LatestReport {
  blockers: string[]
  date: string
  files: {
    daily?: string
    knowledge?: string
    latestMarkdown?: string
    rawData?: string
  }
  highlights: string[]
  stats: {
    chunks?: number
    totalEvents: number
    totalProblems: number
    totalSessions: number
  }
  summary: string
  title: string
  updatedAt: string
}

export interface AnalysisPreviewResult {
  chunks: number
  date: string
  enabledSources: SourceType[]
  eventsAfterFilter: number
  eventsBeforeFilter: number
  filesScanned: string[]
  filters: {
    excludeProjects?: string[]
    minEvents?: number
    projects?: string[]
  }
  llm: {
    baseUrl?: string
    model?: string
    provider: LLMConfig['provider']
  }
  output: {
    rawData: boolean
    wouldWriteFiles: string[]
  }
  redactionEnabled: boolean
  sessionsAfterFilter: number
  sessionsBeforeFilter: number
}

export interface AnalysisProgressEvent {
  detail?: string
  stage: 'chunk' | 'done' | 'filter' | 'llm' | 'redact' | 'scan' | 'write'
  status: 'done' | 'start'
}

export interface SessionPreview {
  durationMinutes: number
  events: number
  project?: string
  sessionId: string
  source?: string
}

export interface DataSource {
  available: boolean
  description: string
  filesFound: number
  name: string
  paths: string[]
  type: SourceType
}

export interface LLMConfig {
  apiKey?: string
  baseUrl?: string
  model?: string
  provider: 'anthropic' | 'generic' | 'openai'
}

export interface AppConfig {
  llm: LLMConfig
  output?: {
    writeLatest: boolean
    writeRawData: boolean
  }
  outputDir?: string
  redact?: {
    enabled: boolean
    patterns: string[]
  }
  sources?: {
    enabled: SourceType[]
  }
  timezone?: string
}

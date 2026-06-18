export interface SkillMeta {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  triggerWords: string[]
  path: string
  lastModified: Date
  hasGit: boolean
  gitRemote?: string
  gitBranch?: string
  gitAhead: number
  gitBehind: number
  usageCount: number
  templates: string[]
  sourceDir: string
}

export interface ProjectMeta {
  id: string
  name: string
  description: string
  path: string
  type: 'fullstack' | 'frontend' | 'backend' | 'skill-source' | 'content' | 'tool' | 'unknown'
  techStack: string[]
  hasGitRemote: boolean
  gitRemote?: string
  gitBranch?: string
  lastCommit?: { message: string; date: string }
  gitAhead: number
  gitBehind: number
  hasClaudeConfig: boolean
  hasAgentsConfig: boolean
  hasDeployConfig: boolean
  deployFiles: string[]
  lastModified: Date
  healthScore: number
  sourceDir: string
}

export interface ObsService {
  id: string
  name: string
  baseUrl: string
  enabled: boolean
  authToken?: string
}

export interface AlertRule {
  id: string
  name: string
  metric: 'error_rate' | 'avg_latency_ms' | 'total_cost_cny' | 'asr_cost_cny' | 'daily_calls' | 'auth_error_count' | 'rate_limit_count'
  operator: '>' | '>='
  threshold: number
  serviceIds: string[]
  enabled: boolean
  cooldownMs: number
}

export interface AlertEvent {
  id: string
  ts: number
  ruleId: string
  ruleName: string
  serviceId: string
  serviceName: string
  metric: string
  value: number
  threshold: number
}

export interface PricingEntry {
  id: string
  type: 'llm' | 'asr'
  provider: string
  model: string       // LLM: 模型名；ASR: 服务标识（如 "doubao-asr-bigmodel"）
  inputPer1k: number  // LLM: 输入 token ¥/1K；ASR: ¥/分钟
  outputPer1k: number // LLM: 输出 token ¥/1K；ASR: 无意义填 0
}

export interface QuasarConfig {
  skillsDirs: string[]
  projectsDirs: string[]
  appearance: 'dark' | 'light' | 'system'
  accent?: string
  autoScan: boolean
  scanIntervalMs: number
  obsServices: ObsService[]
  alertRules: AlertRule[]
  pricing: PricingEntry[]
  // Optional path to a local SQLite obs.db for the per-project Obs tab.
  // When unset or missing, the single-project obs endpoint degrades to empty data.
  obsDbPath?: string
}

export interface CacheData {
  skills: SkillMeta[]
  projects: ProjectMeta[]
  lastScanned: string
  version: number
}

export interface SyncResult {
  id: string
  type: 'skill' | 'project'
  action: 'pull' | 'push'
  success: boolean
  message: string
  timestamp: string
}

// ─── Quasar Report (central lifecycle report store) ───────────────────────────

export type ReportRunType = 'darwin' | 'test-architect' | 'skill-universalizer'
export type ReportTargetType = 'skill' | 'project'

export interface DarwinPayload {
  scoreBefore: number
  scoreAfter: number
  dimension?: string
  mode?: string
  commit?: string
}

export interface TestPayload {
  total: number
  passed: number
  failed_new: number
  failed_preexisting: number
  pass_rate: number
  new_issues?: Array<{ priority: string; title: string; layer: string }>
}

export interface UniversalizerPayload {
  verdict: 'go' | 'no-go' | 'go-with-changes'
  valueScore: number
  feasibilityScore: number
  quadrant: string
  summary: string
}

export interface QuasarReport {
  id: string
  runType: ReportRunType
  targetPath: string
  targetType: ReportTargetType
  targetName: string
  timestamp: string
  status: string
  headline: string
  nativeReportPath?: string
  payload: DarwinPayload | TestPayload | UniversalizerPayload
}

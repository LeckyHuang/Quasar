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

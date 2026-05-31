export type SuggestionLevel = 'critical' | 'warn' | 'info'
export type SuggestionCategory = 'availability' | 'error' | 'latency' | 'cost' | 'model' | 'config'

export interface Suggestion {
  level: SuggestionLevel
  category: SuggestionCategory
  title: string
  detail: string
  service?: string
}

interface ServiceResult {
  id: string
  name: string
  status: 'ok' | 'down'
  error?: string
  data?: {
    summary: {
      total_calls: number; error_count: number; error_rate: number
      avg_latency_ms: number; total_cost_cny: number; total_tokens: number
    }
    by_model: Array<{
      model: string; provider: string; calls: number
      total_tokens: number; cost_cny: number | null; avg_latency_ms: number | null
    }>
    recent_calls: Array<{ cost_cny: number | null; input_tokens: number | null; output_tokens: number | null }>
  }
}

interface AggregateInput {
  summary: {
    total_calls: number; error_count: number; error_rate: number
    avg_latency_ms: number; total_cost_cny: number
  } | null
  services: ServiceResult[]
  days: number
}

export function generateSuggestions(data: AggregateInput): Suggestion[] {
  const suggestions: Suggestion[] = []
  const { summary, services, days } = data

  // ── 全局汇总分析 ───────────────────────────────
  if (summary) {
    if (summary.error_rate > 0.15) {
      suggestions.push({
        level: 'critical', category: 'error',
        title: `整体错误率过高 (${(summary.error_rate * 100).toFixed(1)}%)`,
        detail: '超过 15% 的 LLM 调用失败。请立即检查各服务的 API Key 有效性、模型可用性及网络连通性。',
      })
    } else if (summary.error_rate > 0.05) {
      suggestions.push({
        level: 'warn', category: 'error',
        title: `整体错误率偏高 (${(summary.error_rate * 100).toFixed(1)}%)`,
        detail: '错误率超过 5%，建议排查近期错误日志，确认模型服务稳定性。',
      })
    }

    if (summary.avg_latency_ms > 60000) {
      suggestions.push({
        level: 'critical', category: 'latency',
        title: `平均响应时间极高 (${(summary.avg_latency_ms / 1000).toFixed(1)}s)`,
        detail: '超过 60s 的平均延迟会严重影响用户体验。建议优先使用流式输出（streaming），或评估是否切换更快的模型。',
      })
    } else if (summary.avg_latency_ms > 30000) {
      suggestions.push({
        level: 'warn', category: 'latency',
        title: `平均响应时间较高 (${(summary.avg_latency_ms / 1000).toFixed(1)}s)`,
        detail: '超过 30s 的响应时间建议开启流式输出，让用户感知到进度，避免等待超时。',
      })
    }
  }

  // ── 逐服务分析 ───────────────────────────────
  for (const svc of services) {
    if (svc.status === 'down') {
      suggestions.push({
        level: 'critical', category: 'availability',
        title: `服务「${svc.name}」无法连接`,
        detail: `错误：${svc.error || '连接失败'}。请检查服务是否正常运行，obs router 是否已挂载。`,
        service: svc.name,
      })
      continue
    }

    const s = svc.data!.summary
    const models = svc.data!.by_model

    // 无调用记录
    if (s.total_calls === 0) {
      suggestions.push({
        level: 'info', category: 'availability',
        title: `服务「${svc.name}」近 ${days} 天无调用记录`,
        detail: '可能服务未被使用，或 obs.init() 未正确调用，或 obs 集成尚未部署至生产。',
        service: svc.name,
      })
      continue
    }

    // 服务级错误率
    if (s.error_rate > 0.15) {
      suggestions.push({
        level: 'critical', category: 'error',
        title: `「${svc.name}」错误率 ${(s.error_rate * 100).toFixed(1)}%`,
        detail: `该服务 ${s.error_count} 次调用失败。请检查 Obs 监控 Tab 中的最近错误详情。`,
        service: svc.name,
      })
    }

    // 费用未记录（定价表缺失）
    const nullCostCalls = svc.data!.recent_calls.filter(c => c.cost_cny == null).length
    if (nullCostCalls > 0 && models.length > 0) {
      const unknownModels = models.filter(m => m.cost_cny == null).map(m => m.model.slice(0, 20))
      if (unknownModels.length > 0) {
        suggestions.push({
          level: 'info', category: 'config',
          title: `「${svc.name}」有模型未配置定价`,
          detail: `模型 ${unknownModels.join('、')} 的费用无法计算。请在 obs/pricing.py 中补充对应定价，以获得准确的成本统计。`,
          service: svc.name,
        })
      }
    }

    // 模型延迟对比：同服务内有快有慢
    if (models.length >= 2) {
      const withLatency = models.filter(m => m.avg_latency_ms != null)
      if (withLatency.length >= 2) {
        const sorted = [...withLatency].sort((a, b) => (a.avg_latency_ms ?? 0) - (b.avg_latency_ms ?? 0))
        const fastest = sorted[0], slowest = sorted[sorted.length - 1]
        const ratio = (slowest.avg_latency_ms ?? 0) / (fastest.avg_latency_ms ?? 1)
        if (ratio > 3 && (fastest.avg_latency_ms ?? 0) > 0) {
          suggestions.push({
            level: 'info', category: 'model',
            title: `「${svc.name}」模型延迟差异显著`,
            detail: `${fastest.model.slice(0, 20)} 平均 ${((fastest.avg_latency_ms ?? 0) / 1000).toFixed(1)}s，而 ${slowest.model.slice(0, 20)} 平均 ${((slowest.avg_latency_ms ?? 0) / 1000).toFixed(1)}s。对延迟敏感的场景可优先考虑前者。`,
            service: svc.name,
          })
        }
      }
    }

    // Token 效率：output/input 比极低
    const recentWithTokens = svc.data!.recent_calls.filter(c => c.input_tokens && c.output_tokens)
    if (recentWithTokens.length >= 3) {
      const avgRatio = recentWithTokens.reduce((sum, c) => sum + (c.output_tokens! / c.input_tokens!), 0) / recentWithTokens.length
      if (avgRatio < 0.05) {
        suggestions.push({
          level: 'info', category: 'cost',
          title: `「${svc.name}」输出 Token 占比极低`,
          detail: `输出/输入 Token 比约 ${(avgRatio * 100).toFixed(1)}%，大量 Token 消耗在输入上。建议检查 Prompt 是否过长，或考虑压缩上下文以降低成本。`,
          service: svc.name,
        })
      }
    }
  }

  // 按优先级排序：critical > warn > info
  const order: Record<SuggestionLevel, number> = { critical: 0, warn: 1, info: 2 }
  return suggestions.sort((a, b) => order[a.level] - order[b.level])
}

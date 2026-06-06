import { NextRequest, NextResponse } from 'next/server'
import { readConfig } from '@/lib/config'
import { readAlertHistory } from '@/lib/obsAlerts'
import type { ObsService, PricingEntry } from '@/types'

const FETCH_TIMEOUT_MS = 6000

interface TraceSpan {
  type: 'span' | 'llm'; operation: string; provider?: string; model?: string
  start_ts: number; end_ts: number; latency_ms: number; status: string
  error_msg?: string; cost_cny?: number; input_tokens?: number; output_tokens?: number
  metadata?: Record<string, unknown>
}
interface ObsTrace {
  trace_id: string; start_ts: number; total_latency_ms: number; status: string; spans: TraceSpan[]
}

interface ObsStatsResponse {
  summary: {
    total_calls: number
    error_count: number
    error_rate: number
    avg_latency_ms: number
    total_cost_cny: number
    total_tokens: number
    period_days: number
  }
  latency_percentiles?: { p50: number | null; p95: number | null; p99: number | null }
  by_day: Array<{ day: string; calls: number; cost_cny: number | null; avg_latency_ms: number | null; errors: number }>
  by_model: Array<{ model: string; provider: string; calls: number; input_tokens: number | null; output_tokens: number | null; total_tokens: number; cost_cny: number | null; avg_latency_ms: number | null }>
  by_project: Array<{ project: string; calls: number; cost_cny: number | null; avg_latency_ms: number | null; errors: number }>
  recent_errors: unknown[]
  recent_calls: unknown[]
  asr_stats?: Array<{
    provider: string
    calls: number
    total_duration_s: number
    total_minutes: number
  }>
  error_breakdown?: Record<string, number>
}

async function fetchService(svc: ObsService, days: number): Promise<
  { id: string; name: string; baseUrl: string; status: 'ok'; data: ObsStatsResponse } |
  { id: string; name: string; baseUrl: string; status: 'down'; error: string }
> {
  const url = `${svc.baseUrl.replace(/\/$/, '')}/obs/stats?days=${days}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' }
    if (svc.authToken) headers['Authorization'] = `Bearer ${svc.authToken}`
    const res = await fetch(url, { signal: controller.signal, headers, cache: 'no-store' })
    if (!res.ok) return { id: svc.id, name: svc.name, baseUrl: svc.baseUrl, status: 'down', error: `HTTP ${res.status}` }
    const data: ObsStatsResponse = await res.json()
    return { id: svc.id, name: svc.name, baseUrl: svc.baseUrl, status: 'ok', data }
  } catch (e) {
    const msg = e instanceof Error ? (e.name === 'AbortError' ? 'Timeout' : e.message) : String(e)
    return { id: svc.id, name: svc.name, baseUrl: svc.baseUrl, status: 'down', error: msg }
  } finally {
    clearTimeout(timer)
  }
}

function lookupLlmPrice(model: string, provider: string, pricing: PricingEntry[]): { input: number; output: number } | null {
  const m = model.toLowerCase().trim()
  const p = provider.toLowerCase().trim()
  // 精确匹配 model
  let entry = pricing.find(e => e.type === 'llm' && e.model.toLowerCase() === m)
  // 前缀匹配（应对带日期版本号如 qwen-turbo-2025-04-28）
  if (!entry) entry = pricing.find(e => e.type === 'llm' && m.startsWith(e.model.toLowerCase()))
  // provider 匹配兜底
  if (!entry) entry = pricing.find(e => e.type === 'llm' && e.provider.toLowerCase() === p)
  return entry ? { input: entry.inputPer1k, output: entry.outputPer1k } : null
}

function calcModelCost(
  inputTokens: number | null,
  outputTokens: number | null,
  model: string,
  provider: string,
  pricing: PricingEntry[],
  fallbackCost: number | null,
): number | null {
  if (pricing.length > 0) {
    const price = lookupLlmPrice(model, provider, pricing)
    if (price && inputTokens != null && outputTokens != null) {
      return (inputTokens / 1000 * price.input) + (outputTokens / 1000 * price.output)
    }
    // 有定价表但没匹配到 → 返回 null（显示"未知"比用 0 有意义）
    return null
  }
  // 没有定价表 → 用 Python 端记录的 fallback
  return fallbackCost
}

function aggregateByModel(
  results: Array<{ id: string; name: string; status: 'ok'; data: ObsStatsResponse }>,
  pricing: PricingEntry[],
) {
  const map = new Map<string, {
    model: string; provider: string; service: string
    calls: number; input_tokens: number; output_tokens: number; total_tokens: number
    cost_cny_sum: number | null; latency_sum: number; latency_count: number
  }>()

  for (const r of results) {
    for (const m of r.data.by_model) {
      const key = `${r.id}::${m.model}`
      const existing = map.get(key)
      const latency = m.avg_latency_ms ?? 0
      const inTok = m.input_tokens ?? 0
      const outTok = m.output_tokens ?? 0

      if (existing) {
        existing.calls += m.calls
        existing.input_tokens += inTok
        existing.output_tokens += outTok
        existing.total_tokens += m.total_tokens || 0
        if (existing.cost_cny_sum !== null && m.cost_cny !== null) existing.cost_cny_sum += m.cost_cny
        else existing.cost_cny_sum = null
        existing.latency_sum += latency * m.calls
        existing.latency_count += m.calls
      } else {
        map.set(key, {
          model: m.model, provider: m.provider, service: r.name,
          calls: m.calls, input_tokens: inTok, output_tokens: outTok,
          total_tokens: m.total_tokens || 0,
          cost_cny_sum: m.cost_cny ?? null,
          latency_sum: latency * m.calls, latency_count: m.calls,
        })
      }
    }
  }

  return Array.from(map.values())
    .map(m => {
      const cost = calcModelCost(m.input_tokens, m.output_tokens, m.model, m.provider, pricing, m.cost_cny_sum)
      return {
        model: m.model, provider: m.provider, service: m.service,
        calls: m.calls, input_tokens: m.input_tokens, output_tokens: m.output_tokens,
        total_tokens: m.total_tokens,
        cost_cny: cost != null ? Math.round(cost * 100000) / 100000 : null,
        avg_latency_ms: m.latency_count > 0 ? Math.round((m.latency_sum / m.latency_count) * 10) / 10 : null,
      }
    })
    .sort((a, b) => (b.cost_cny ?? -1) - (a.cost_cny ?? -1))
}

function aggregateAsrCost(
  results: Array<{ id: string; name: string; status: 'ok'; data: ObsStatsResponse }>,
  pricing: PricingEntry[],
): Array<{
  provider: string
  calls: number
  total_duration_s: number
  total_minutes: number
  cost_cny: number | null
}> {
  const map = new Map<string, { provider: string; calls: number; total_duration_s: number; total_minutes: number }>()

  for (const r of results) {
    for (const a of r.data.asr_stats ?? []) {
      const existing = map.get(a.provider)
      if (existing) {
        existing.calls += a.calls
        existing.total_duration_s += a.total_duration_s
        existing.total_minutes += a.total_minutes
      } else {
        map.set(a.provider, { ...a })
      }
    }
  }

  return Array.from(map.values()).map(a => {
    const entry = pricing.find(e => e.type === 'asr' && e.provider.toLowerCase() === a.provider.toLowerCase())
    const cost_cny = entry ? Math.round(a.total_minutes * entry.inputPer1k * 100000) / 100000 : null
    return { ...a, cost_cny }
  })
}

function aggregateSummaries(results: Array<{ status: 'ok'; data: ObsStatsResponse }>) {
  let total_calls = 0, error_count = 0, total_cost_cny = 0, total_tokens = 0
  let latency_sum = 0, latency_count = 0
  let auth_error_count = 0, rate_limit_count = 0

  for (const r of results) {
    const s = r.data.summary
    total_calls += s.total_calls
    error_count += s.error_count
    total_cost_cny += s.total_cost_cny || 0
    total_tokens += s.total_tokens || 0
    if (s.avg_latency_ms && s.total_calls > 0) {
      latency_sum += s.avg_latency_ms * (s.total_calls - s.error_count)
      latency_count += s.total_calls - s.error_count
    }
    const eb = r.data.error_breakdown ?? {}
    auth_error_count += eb.auth ?? 0
    rate_limit_count += (eb.rate_limit ?? 0) + (eb.rate_limit_hit ?? 0)
  }

  // P50/P95/P99: take the max across services (slowest service defines user experience)
  const p50s = results.map(r => r.data.latency_percentiles?.p50).filter((v): v is number => v != null)
  const p95s = results.map(r => r.data.latency_percentiles?.p95).filter((v): v is number => v != null)
  const p99s = results.map(r => r.data.latency_percentiles?.p99).filter((v): v is number => v != null)

  return {
    total_calls,
    error_count,
    error_rate: total_calls > 0 ? Math.round((error_count / total_calls) * 10000) / 10000 : 0,
    avg_latency_ms: latency_count > 0 ? Math.round((latency_sum / latency_count) * 10) / 10 : 0,
    total_cost_cny: Math.round(total_cost_cny * 10000) / 10000,
    total_tokens,
    latency_p50: p50s.length > 0 ? Math.max(...p50s) : null,
    latency_p95: p95s.length > 0 ? Math.max(...p95s) : null,
    latency_p99: p99s.length > 0 ? Math.max(...p99s) : null,
    auth_error_count,
    rate_limit_count,
  }
}

export async function GET(req: NextRequest) {
  const rawDays = parseInt(req.nextUrl.searchParams.get('days') || '7', 10)
  const days = isNaN(rawDays) || rawDays <= 0 ? 7 : Math.min(rawDays, 365)

  const config = readConfig()
  const enabled = config.obsServices.filter(s => s.enabled)

  if (enabled.length === 0) {
    return NextResponse.json({ services: [], summary: null, alerts: readAlertHistory().slice(0, 50) })
  }

  const [results, tracesPerSvc] = await Promise.all([
    Promise.all(enabled.map(svc => fetchService(svc, days))),
    Promise.all(enabled.map(async svc => {
      try {
        const url = `${svc.baseUrl.replace(/\/$/, '')}/obs/traces?limit=20&days=${days}`
        const headers: Record<string, string> = { 'Accept': 'application/json' }
        if (svc.authToken) headers['Authorization'] = `Bearer ${svc.authToken}`
        const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers, cache: 'no-store' })
        if (!res.ok) return { id: svc.id, name: svc.name, traces: [] as ObsTrace[] }
        const traces: ObsTrace[] = await res.json()
        return { id: svc.id, name: svc.name, traces }
      } catch { return { id: svc.id, name: svc.name, traces: [] as ObsTrace[] } }
    })),
  ])

  const okResults = results.filter(r => r.status === 'ok') as Array<{ status: 'ok'; data: ObsStatsResponse } & { id: string; name: string; baseUrl: string }>
  const llmSummary = okResults.length > 0 ? aggregateSummaries(okResults) : null
  const by_model = aggregateByModel(okResults, config.pricing ?? [])

  // ASR cost aggregation (from full SQL stats returned by each service)
  const asr_summary = aggregateAsrCost(okResults, config.pricing ?? [])

  // Merge ASR cost into summary total (only include ASR costs that have a pricing entry)
  let summary = llmSummary
  if (summary != null && asr_summary.length > 0) {
    const asrTotalCost = asr_summary.reduce((acc, a) => {
      return a.cost_cny != null ? acc + a.cost_cny : acc
    }, 0)
    summary = {
      ...summary,
      total_cost_cny: Math.round((summary.total_cost_cny + asrTotalCost) * 10000) / 10000,
    }
  }

  // Attach service name to each trace, sort newest first
  const traces = tracesPerSvc
    .flatMap(s => s.traces.map(t => ({ ...t, serviceName: s.name, serviceId: s.id })))
    .sort((a, b) => b.start_ts - a.start_ts)

  return NextResponse.json({
    summary,
    services: results,
    by_model,
    asr_summary,
    traces,
    alerts: readAlertHistory().slice(0, 50),
    days,
  })
}

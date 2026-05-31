import { NextRequest, NextResponse } from 'next/server'
import { readConfig } from '@/lib/config'
import { readAlertHistory } from '@/lib/obsAlerts'
import type { ObsService } from '@/types'

const FETCH_TIMEOUT_MS = 6000

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
  by_day: Array<{ day: string; calls: number; cost_cny: number | null; avg_latency_ms: number | null; errors: number }>
  by_model: Array<{ model: string; provider: string; calls: number; total_tokens: number; cost_cny: number | null; avg_latency_ms: number | null }>
  by_project: Array<{ project: string; calls: number; cost_cny: number | null; avg_latency_ms: number | null; errors: number }>
  recent_errors: unknown[]
  recent_calls: unknown[]
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

function aggregateSummaries(results: Array<{ status: 'ok'; data: ObsStatsResponse }>) {
  let total_calls = 0, error_count = 0, total_cost_cny = 0, total_tokens = 0
  let latency_sum = 0, latency_count = 0

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
  }

  return {
    total_calls,
    error_count,
    error_rate: total_calls > 0 ? Math.round((error_count / total_calls) * 10000) / 10000 : 0,
    avg_latency_ms: latency_count > 0 ? Math.round((latency_sum / latency_count) * 10) / 10 : 0,
    total_cost_cny: Math.round(total_cost_cny * 10000) / 10000,
    total_tokens,
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

  const results = await Promise.all(enabled.map(svc => fetchService(svc, days)))

  const okResults = results.filter(r => r.status === 'ok') as Array<{ status: 'ok'; data: ObsStatsResponse } & { id: string; name: string; baseUrl: string }>
  const summary = okResults.length > 0 ? aggregateSummaries(okResults) : null

  return NextResponse.json({
    summary,
    services: results,
    alerts: readAlertHistory().slice(0, 50),
    days,
  })
}

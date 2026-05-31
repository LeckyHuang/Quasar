import { NextRequest, NextResponse } from 'next/server'
import { readConfig } from '@/lib/config'
import { evaluateRules, appendAlertEvents } from '@/lib/obsAlerts'

const FETCH_TIMEOUT_MS = 6000

export async function POST(req: NextRequest) {
  void req
  const config = readConfig()
  const enabled = config.obsServices.filter(s => s.enabled)
  if (enabled.length === 0 || config.alertRules.length === 0) {
    return NextResponse.json({ fired: 0 })
  }

  const snapshots = await Promise.all(enabled.map(async svc => {
    const url = `${svc.baseUrl.replace(/\/$/, '')}/obs/stats?days=1`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' }
      if (svc.authToken) headers['Authorization'] = `Bearer ${svc.authToken}`
      const res = await fetch(url, { signal: controller.signal, headers, cache: 'no-store' })
      if (!res.ok) return null
      const data = await res.json()
      return {
        id: svc.id,
        name: svc.name,
        summary: {
          error_rate: data.summary?.error_rate ?? 0,
          avg_latency_ms: data.summary?.avg_latency_ms ?? 0,
          total_cost_cny: data.summary?.total_cost_cny ?? 0,
        },
      }
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }))

  const valid = snapshots.filter(Boolean) as NonNullable<(typeof snapshots)[number]>[]
  const fired = evaluateRules(config.alertRules, valid)
  if (fired.length > 0) appendAlertEvents(fired)

  return NextResponse.json({ fired: fired.length, events: fired })
}

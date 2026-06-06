import fs from 'fs'
import path from 'path'
import os from 'os'
import type { AlertEvent, AlertRule } from '@/types'

const ALERTS_FILE = path.join(os.homedir(), '.quasar', 'obs-alerts.json')
const MAX_HISTORY = 200

export function readAlertHistory(): AlertEvent[] {
  try {
    if (!fs.existsSync(ALERTS_FILE)) return []
    return JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

export function appendAlertEvents(events: AlertEvent[]): void {
  if (events.length === 0) return
  const dir = path.dirname(ALERTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const existing = readAlertHistory()
  const merged = [...events, ...existing].slice(0, MAX_HISTORY)
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(merged, null, 2), 'utf-8')
}

interface ServiceSnapshot {
  id: string
  name: string
  summary: {
    error_rate: number
    avg_latency_ms: number
    total_cost_cny: number
    asr_cost_cny?: number
    daily_calls?: number
    auth_error_count?: number
    rate_limit_count?: number
  }
}

export function evaluateRules(rules: AlertRule[], services: ServiceSnapshot[]): AlertEvent[] {
  const now = Date.now() / 1000
  const history = readAlertHistory()
  const fired: AlertEvent[] = []

  for (const rule of rules) {
    if (!rule.enabled) continue
    const targets = rule.serviceIds.length === 0
      ? services
      : services.filter(s => rule.serviceIds.includes(s.id))

    for (const svc of targets) {
      const value = svc.summary[rule.metric]
      if (value == null) continue
      const breached = rule.operator === '>' ? value > rule.threshold : value >= rule.threshold
      if (!breached) continue

      // cooldown check
      const lastFired = history.find(e => e.ruleId === rule.id && e.serviceId === svc.id)
      if (lastFired && now - lastFired.ts < rule.cooldownMs / 1000) continue

      fired.push({
        id: `${rule.id}-${svc.id}-${Math.floor(now)}`,
        ts: now,
        ruleId: rule.id,
        ruleName: rule.name,
        serviceId: svc.id,
        serviceName: svc.name,
        metric: rule.metric,
        value,
        threshold: rule.threshold,
      })
    }
  }

  return fired
}
